import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FreshnessStatus, OrderStatus } from "@prisma/client";
import {
  QUEUE_DISPATCH,
  QUEUE_ORDER_TIMEOUT,
  QUEUE_BATCH_EXPIRY,
  JOB_DISPATCH_TIMEOUT,
  JOB_CANCEL_STALE_ORDER,
  JOB_CHECK_BATCH_EXPIRY,
} from "./jobs.constants";

@Processor(QUEUE_DISPATCH)
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === JOB_DISPATCH_TIMEOUT) {
      const { orderId, partnerId } = job.data;
      this.logger.warn(
        `⏰ 45-second dispatch timeout triggered for Order: ${orderId}, Partner: ${partnerId}`,
      );

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { deliveryTrips: true },
      });

      if (!order) return;

      // If order is still waiting or partner hasn't accepted, unassign and return to DISPATCH_READY
      if (
        order.status === OrderStatus.ASSIGNED &&
        order.deliveryPartnerId === partnerId
      ) {
        await this.prisma.$transaction([
          this.prisma.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.DISPATCH_READY,
              deliveryPartnerId: null,
            },
          }),
          this.prisma.orderStatusEvent.create({
            data: {
              orderId,
              fromStatus: OrderStatus.ASSIGNED,
              toStatus: OrderStatus.DISPATCH_READY,
              note: `Partner ${partnerId} did not accept within 45 seconds. Returned to dispatch queue.`,
            },
          }),
        ]);
        this.logger.log(
          `Order ${orderId} returned to DISPATCH_READY pool for re-assignment.`,
        );
      }
    }
  }
}

@Processor(QUEUE_ORDER_TIMEOUT)
export class OrderTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderTimeoutProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === JOB_CANCEL_STALE_ORDER) {
      const { orderId } = job.data;
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (order && order.status === OrderStatus.PLACED) {
        this.logger.warn(
          `Stale order ${orderId} auto-cancelled after timeout.`,
        );

        await this.prisma.$transaction(async (tx) => {
          // 1. Release reserved stock back to batches
          for (const item of order.items) {
            if (item.batchId) {
              const kgToAdd = (item.grossWeightGrams * item.quantity) / 1000;
              await tx.inventoryBatch.update({
                where: { id: item.batchId },
                data: {
                  remainingQuantityKg: { increment: kgToAdd },
                },
              });
            }
          }

          // 2. Mark order cancelled
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.CANCELLED,
              cancelReason:
                "Auto-cancelled: Order unconfirmed / checkout expired",
              cancelledAt: new Date(),
            },
          });

          // 3. Log event
          await tx.orderStatusEvent.create({
            data: {
              orderId,
              fromStatus: OrderStatus.PLACED,
              toStatus: OrderStatus.CANCELLED,
              note: "Order auto-cancelled due to payment/confirmation timeout.",
            },
          });
        });
      }
    }
  }
}

@Processor(QUEUE_BATCH_EXPIRY)
export class BatchExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchExpiryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === JOB_CHECK_BATCH_EXPIRY) {
      const now = new Date();
      const approachingExpiry = new Date(now.getTime() + 6 * 3600 * 1000); // within 6 hours

      // Mark expired batches
      const expiredResult = await this.prisma.inventoryBatch.updateMany({
        where: {
          expiryDate: { lte: now },
          freshnessStatus: { not: FreshnessStatus.EXPIRED },
          isActive: true,
        },
        data: {
          freshnessStatus: FreshnessStatus.EXPIRED,
          isActive: false,
        },
      });

      // Mark aging batches
      const agingResult = await this.prisma.inventoryBatch.updateMany({
        where: {
          expiryDate: { lte: approachingExpiry, gt: now },
          freshnessStatus: FreshnessStatus.FRESH,
          isActive: true,
        },
        data: {
          freshnessStatus: FreshnessStatus.AGING,
        },
      });

      if (expiredResult.count > 0 || agingResult.count > 0) {
        this.logger.warn(
          `Batch freshness audit: ${expiredResult.count} batches expired, ${agingResult.count} batches marked aging.`,
        );
      }
    }
  }
}
