import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateBatchIntakeDto } from "./dto/inventory.dto";
import { FreshnessStatus, Prisma } from "@prisma/client";

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBatch(dto: CreateBatchIntakeDto) {
    const batchNumber = `BATCH-${Date.now().toString().slice(-6)}`;

    return this.prisma.inventoryBatch.create({
      data: {
        productId: dto.productId,
        hubId: dto.hubId,
        batchNumber,
        catchOrHarvestDate: new Date(dto.catchOrHarvestDate),
        originSource: dto.originSource,
        initialQuantityKg: dto.initialQuantityKg,
        remainingQuantityKg: dto.initialQuantityKg,
        temperatureAtIntake: dto.temperatureAtIntake,
        expiryDate: new Date(dto.expiryDate),
        freshnessStatus: FreshnessStatus.FRESH,
      },
    });
  }

  async getBatches(productId?: string) {
    return this.prisma.inventoryBatch.findMany({
      where: {
        productId: productId || undefined,
        isActive: true,
      },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        hub: { select: { id: true, name: true } },
      },
      orderBy: { catchOrHarvestDate: "desc" },
    });
  }

  /**
   * Concurrency-safe inventory deduction using raw row-locking:
   * SELECT ... FOR UPDATE within a Prisma Interactive Transaction.
   * Rejects simultaneous writers with 409 Conflict if stock changes.
   */
  async deductStockWithLock(
    tx: Prisma.TransactionClient,
    productId: string,
    requestedKg: number,
  ): Promise<{ batchId: string; deductedKg: number }> {
    // Pessimistic Row Lock: Locks the batch row so concurrent checkouts wait or abort
    const batches: Array<{
      id: string;
      productId: string;
      remainingQuantityKg: number;
      version: number;
    }> = await tx.$queryRaw`
      SELECT id, "productId", "remainingQuantityKg", "version"
      FROM "InventoryBatch"
      WHERE "productId" = ${productId}
        AND "isActive" = true
        AND "freshnessStatus" = 'FRESH'
        AND "remainingQuantityKg" > 0
      ORDER BY "catchOrHarvestDate" ASC
      FOR UPDATE;
    `;

    if (!batches || batches.length === 0) {
      throw new ConflictException(
        "Item is currently out of stock. Please review your cart.",
      );
    }

    // Find first batch that can fulfill or partially fulfill (FIFO catch order)
    const targetBatch = batches.find(
      (b) => b.remainingQuantityKg >= requestedKg,
    );

    if (!targetBatch) {
      throw new ConflictException(
        "Stock changed just now: insufficient quantity in current fresh batch. Please review your cart.",
      );
    }

    const updatedRemaining =
      Math.round((targetBatch.remainingQuantityKg - requestedKg) * 1000) / 1000;

    await tx.inventoryBatch.update({
      where: { id: targetBatch.id },
      data: {
        remainingQuantityKg: updatedRemaining,
        version: { increment: 1 },
      },
    });

    this.logger.log(
      `🔒 [Concurrency Row Lock] Deducted ${requestedKg}kg from Batch ${targetBatch.id}. Remaining: ${updatedRemaining}kg`,
    );

    return {
      batchId: targetBatch.id,
      deductedKg: requestedKg,
    };
  }

  /**
   * Release reserved stock back to batch upon cancellation or failure
   */
  async releaseStock(
    tx: Prisma.TransactionClient,
    batchId: string,
    kgToRestore: number,
  ) {
    await tx.inventoryBatch.update({
      where: { id: batchId },
      data: {
        remainingQuantityKg: { increment: kgToRestore },
        version: { increment: 1 },
      },
    });
    this.logger.log(`Restored ${kgToRestore}kg to Batch ${batchId}`);
  }
}
