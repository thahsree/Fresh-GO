import { Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "../../common/redis/redis.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UpdateCartItemDto } from "./dto/cart.dto";

interface RawCartItem {
  productId: string;
  quantity: number;
  cutOptionId?: string;
}

@Injectable()
export class CartService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private getCartKey(userId: string): string {
    return `cart:${userId}`;
  }

  async getCart(userId: string) {
    const rawCartJson = await this.redis.get(this.getCartKey(userId));
    const items: RawCartItem[] = rawCartJson ? JSON.parse(rawCartJson) : [];

    if (items.length === 0) {
      return {
        items: [],
        itemCount: 0,
        subtotal: 0,
        cuttingCharges: 0,
        estimatedTotal: 0,
      };
    }

    const productIds = items.map((it) => it.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { cuts: true },
    });

    let subtotal = 0;
    let cuttingCharges = 0;
    let itemCount = 0;

    const detailedItems = items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product || !product.isActive) return null;

        const cut =
          product.cuts.find((c) => c.id === item.cutOptionId) ||
          product.cuts.find((c) => c.isDefault);
        const unitPrice = product.basePrice;
        const cuttingCharge = cut?.priceModifier || 0.0;
        const lineTotal = (unitPrice + cuttingCharge) * item.quantity;

        subtotal += unitPrice * item.quantity;
        cuttingCharges += cuttingCharge * item.quantity;
        itemCount += item.quantity;

        return {
          productId: product.id,
          name: product.name,
          image: product.image,
          unit: product.unit,
          unitPrice,
          cuttingCharge,
          quantity: item.quantity,
          cutOption: cut ? { id: cut.id, name: cut.name } : null,
          grossWeightDescription: product.grossWeightDescription,
          netWeightDescription: product.netWeightDescription,
          lineTotal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items: detailedItems,
      itemCount,
      subtotal: Math.round(subtotal * 100) / 100,
      cuttingCharges: Math.round(cuttingCharges * 100) / 100,
      estimatedTotal: Math.round((subtotal + cuttingCharges) * 100) / 100,
    };
  }

  async updateItem(userId: string, dto: UpdateCartItemDto) {
    const rawCartJson = await this.redis.get(this.getCartKey(userId));
    let items: RawCartItem[] = rawCartJson ? JSON.parse(rawCartJson) : [];

    const existingIndex = items.findIndex(
      (it) => it.productId === dto.productId,
    );

    if (dto.quantity <= 0) {
      if (existingIndex > -1) {
        items.splice(existingIndex, 1);
      }
    } else {
      if (existingIndex > -1) {
        items[existingIndex].quantity = dto.quantity;
        if (dto.cutOptionId) items[existingIndex].cutOptionId = dto.cutOptionId;
      } else {
        items.push({
          productId: dto.productId,
          quantity: dto.quantity,
          cutOptionId: dto.cutOptionId,
        });
      }
    }

    // Save back to Redis with 14 days TTL (cart abandonment window)
    await this.redis.set(
      this.getCartKey(userId),
      JSON.stringify(items),
      14 * 86400,
    );

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.redis.del(this.getCartKey(userId));
    return { success: true };
  }
}
