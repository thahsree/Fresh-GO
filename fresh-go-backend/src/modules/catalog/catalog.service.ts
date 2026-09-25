import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateProductDto, UpdateProductDto } from "./dto/catalog.dto";
import { FreshnessStatus, Prisma } from "@prisma/client";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getProducts(params?: {
    categorySlug?: string;
    search?: string;
    bestSellerOnly?: boolean;
  }) {
    const { categorySlug, search, bestSellerOnly } = params || {};

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(bestSellerOnly ? { isBestSeller: true } : {}),
      },
      include: {
        category: true,
        cuts: true,
        batches: {
          where: { isActive: true, freshnessStatus: "FRESH" },
          select: {
            id: true,
            batchNumber: true,
            catchOrHarvestDate: true,
            originSource: true,
            remainingQuantityKg: true,
            freshnessStatus: true,
          },
        },
      },
      orderBy: [{ isBestSeller: "desc" }, { rating: "desc" }],
    });

    // Augment with total available stock across active fresh batches
    return products.map((product) => {
      const totalAvailableKg = product.batches.reduce(
        (sum, b) => sum + b.remainingQuantityKg,
        0,
      );
      return {
        ...product,
        availableStockKg: Math.round(totalAvailableKg * 10) / 10,
        isInStock: totalAvailableKg > 0.5,
      };
    });
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        cuts: true,
        batches: {
          where: { isActive: true },
          orderBy: { catchOrHarvestDate: "desc" },
          take: 1,
        },
      },
    });

    if (!product) throw new NotFoundException(`Product ${slug} not found`);

    const latestBatch = product.batches[0];
    const totalAvailableKg = product.batches.reduce(
      (sum, b) => sum + b.remainingQuantityKg,
      0,
    );

    return {
      ...product,
      latestBatch: latestBatch
        ? {
            batchNumber: latestBatch.batchNumber,
            catchDate: latestBatch.catchOrHarvestDate,
            origin: latestBatch.originSource,
            freshness: latestBatch.freshnessStatus,
          }
        : null,
      availableStockKg: Math.round(totalAvailableKg * 10) / 10,
      isInStock: totalAvailableKg > 0.5,
    };
  }

  async createProduct(dto: CreateProductDto) {
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const finalTag =
      dto.tag ||
      (dto.isDailyCatch ? "Fresh Catch" : dto.isFlashFrozen ? "Frozen" : "Fresh");
    const isCatch = finalTag === "Fresh Catch" || Boolean(dto.isDailyCatch);
    const isFrozen = finalTag === "Frozen" || Boolean(dto.isFlashFrozen);

    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        categoryId: dto.categoryId,
        basePrice: dto.basePrice,
        unit: dto.unit,
        description:
          dto.description && dto.description.trim().length > 0
            ? dto.description
            : `${dto.name} - freshly sourced and hygienically packed.`,
        origin: dto.origin || "Local Sourcing",
        storageTip: dto.storageTip || "Store in cold temperature. Consume fresh.",
        grossWeightDescription: dto.grossWeightDescription,
        netWeightDescription: dto.netWeightDescription,
        image:
          dto.image && dto.image.trim().length > 0
            ? dto.image
            : "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80",
        isBestSeller: dto.isBestSeller || false,
        isDailyCatch: isCatch,
        isFlashFrozen: isFrozen,
        tag: finalTag,
        cuts: dto.cuts?.length
          ? {
              create: dto.cuts.map((c) => ({
                name: c.name,
                priceModifier: c.priceModifier || 0.0,
                isDefault: c.isDefault || false,
              })),
            }
          : undefined,
      },
      include: { cuts: true, category: true },
    });

    const stockKg = Number(dto.stock ?? dto.initialStockKg ?? 10);
    if (stockKg > 0) {
      const defaultHub = await this.prisma.hub.findFirst();
      await this.prisma.inventoryBatch.create({
        data: {
          productId: created.id,
          hubId: defaultHub?.id || null,
          batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
          catchOrHarvestDate: new Date(),
          originSource: dto.origin || "Local Sourcing",
          initialQuantityKg: stockKg,
          remainingQuantityKg: stockKg,
          temperatureAtIntake: 2.0,
          freshnessStatus: FreshnessStatus.FRESH,
          expiryDate: new Date(Date.now() + 72 * 3600 * 1000),
          isActive: true,
        },
      });
    }

    return {
      ...created,
      availableStockKg: stockKg,
      isInStock: stockKg > 0.5,
    };
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { batches: { where: { isActive: true } } },
    });

    if (!existing) throw new NotFoundException(`Product ${id} not found`);

    const updateData: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.categoryId !== undefined) {
      updateData.category = { connect: { id: dto.categoryId } };
    }
    if (dto.basePrice !== undefined) updateData.basePrice = dto.basePrice;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.origin !== undefined) updateData.origin = dto.origin;
    if (dto.storageTip !== undefined) updateData.storageTip = dto.storageTip;
    if (dto.image !== undefined) updateData.image = dto.image;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isBestSeller !== undefined) updateData.isBestSeller = dto.isBestSeller;
    if (dto.tag !== undefined) {
      updateData.tag = dto.tag;
      if (dto.tag === "Fresh Catch") {
        updateData.isDailyCatch = true;
        updateData.isFlashFrozen = false;
      } else if (dto.tag === "Frozen") {
        updateData.isFlashFrozen = true;
        updateData.isDailyCatch = false;
      } else {
        updateData.isDailyCatch = false;
        updateData.isFlashFrozen = false;
      }
    } else {
      if (dto.isDailyCatch !== undefined) updateData.isDailyCatch = dto.isDailyCatch;
      if (dto.isFlashFrozen !== undefined) updateData.isFlashFrozen = dto.isFlashFrozen;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, cuts: true },
    });

    const stockVal = dto.stock ?? dto.initialStockKg;
    if (stockVal !== undefined && stockVal >= 0) {
      const activeBatch = existing.batches[0];
      if (activeBatch) {
        await this.prisma.inventoryBatch.update({
          where: { id: activeBatch.id },
          data: {
            remainingQuantityKg: Number(stockVal),
            initialQuantityKg: Math.max(activeBatch.initialQuantityKg, Number(stockVal)),
          },
        });
      } else {
        const defaultHub = await this.prisma.hub.findFirst();
        await this.prisma.inventoryBatch.create({
          data: {
            productId: id,
            hubId: defaultHub?.id || null,
            batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
            catchOrHarvestDate: new Date(),
            originSource: updated.origin || "Local Sourcing",
            initialQuantityKg: Number(stockVal),
            remainingQuantityKg: Number(stockVal),
            temperatureAtIntake: 2.0,
            freshnessStatus: FreshnessStatus.FRESH,
            expiryDate: new Date(Date.now() + 72 * 3600 * 1000),
            isActive: true,
          },
        });
      }
    }

    return {
      ...updated,
      availableStockKg: stockVal !== undefined ? Number(stockVal) : 0,
      isInStock: (stockVal ?? 0) > 0.5,
    };
  }

  async deleteProduct(id: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { orderItems: { take: 1 } },
    });
    if (!existing) throw new NotFoundException(`Product ${id} not found`);

    if (existing.orderItems.length > 0) {
      await this.prisma.inventoryBatch.updateMany({
        where: { productId: id },
        data: { isActive: false, remainingQuantityKg: 0 },
      });
      return this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await this.prisma.inventoryBatch.deleteMany({ where: { productId: id } });
    await this.prisma.productCutOption.deleteMany({ where: { productId: id } });
    return this.prisma.product.delete({ where: { id } });
  }
}
