import { Injectable, Logger, Optional, OnModuleDestroy } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
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

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly inMemoryTimers = new Map<string, NodeJS.Timeout>();
  private batchCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @InjectQueue(QUEUE_DISPATCH) private readonly dispatchQueue?: Queue,
    @Optional() @InjectQueue(QUEUE_ORDER_TIMEOUT) private readonly orderTimeoutQueue?: Queue,
    @Optional() @InjectQueue(QUEUE_BATCH_EXPIRY) private readonly batchExpiryQueue?: Queue,
  ) {
    if (!this.dispatchQueue) {
      this.logger.log(
        "⚡ In-memory job scheduler active (zero Upstash Redis request consumption).",
      );
    }
  }

  /**
   * Schedule a 45-second dispatch acceptance window for a partner.
   * If partner doesn't accept within 45s, worker reassigns to next partner.
   */
  async scheduleDispatchTimeout(
    orderId: string,
    partnerId: string,
    delaySeconds = 45,
  ) {
    const jobId = `dispatch-timeout-${orderId}-${partnerId}`;

    if (this.dispatchQueue) {
      try {
        await this.dispatchQueue.add(
          JOB_DISPATCH_TIMEOUT,
          { orderId, partnerId },
          {
            jobId,
            delay: delaySeconds * 1000,
            removeOnComplete: true,
          },
        );
        this.logger.log(
          `Scheduled 45s dispatch timeout for order ${orderId} assigned to partner ${partnerId} via BullMQ`,
        );
        return;
      } catch (err: any) {
        this.logger.warn(
          `BullMQ queue add failed, falling back to in-memory timer: ${err.message}`,
        );
      }
    }

    // In-memory fallback
    const existing = this.inMemoryTimers.get(jobId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.inMemoryTimers.delete(jobId);
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
        });

        if (
          order &&
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
            `[In-Memory] Order ${orderId} returned to DISPATCH_READY pool for re-assignment.`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Error executing in-memory dispatch timeout for order ${orderId}: ${err.message}`,
        );
      }
    }, delaySeconds * 1000);

    this.inMemoryTimers.set(jobId, timer);
    this.logger.log(
      `Scheduled in-memory dispatch timeout (${delaySeconds}s) for order ${orderId}`,
    );
  }

  /**
   * Remove dispatch timeout job if partner accepts before timeout expires
   */
  async cancelDispatchTimeout(orderId: string, partnerId: string) {
    const jobId = `dispatch-timeout-${orderId}-${partnerId}`;
    const timer = this.inMemoryTimers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.inMemoryTimers.delete(jobId);
      this.logger.log(`Cancelled in-memory dispatch timeout for job ${jobId}`);
    }

    if (this.dispatchQueue) {
      try {
        const job = await this.dispatchQueue.getJob(jobId);
        if (job) {
          await job.remove();
          this.logger.log(`Cancelled BullMQ dispatch timeout job ${jobId}`);
        }
      } catch {}
    }
  }

  /**
   * Auto-cancel unconfirmed order after 15 minutes
   */
  async scheduleOrderTimeout(orderId: string, delayMinutes = 15) {
    const jobId = `order-timeout-${orderId}`;

    if (this.orderTimeoutQueue) {
      try {
        await this.orderTimeoutQueue.add(
          JOB_CANCEL_STALE_ORDER,
          { orderId },
          {
            jobId,
            delay: delayMinutes * 60 * 1000,
            removeOnComplete: true,
          },
        );
        this.logger.log(
          `Scheduled auto-cancel for order ${orderId} after ${delayMinutes}m via BullMQ`,
        );
        return;
      } catch (err: any) {
        this.logger.warn(
          `BullMQ queue add failed, falling back to in-memory timer: ${err.message}`,
        );
      }
    }

    // In-memory fallback
    const timer = setTimeout(async () => {
      this.inMemoryTimers.delete(jobId);
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (order && order.status === OrderStatus.PLACED) {
          await this.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
              if (item.batchId) {
                const kgToAdd =
                  (item.grossWeightGrams * item.quantity) / 1000;
                await tx.inventoryBatch.update({
                  where: { id: item.batchId },
                  data: {
                    remainingQuantityKg: { increment: kgToAdd },
                  },
                });
              }
            }
            await tx.order.update({
              where: { id: orderId },
              data: {
                status: OrderStatus.CANCELLED,
                cancelReason:
                  "Auto-cancelled: Order unconfirmed / checkout expired",
                cancelledAt: new Date(),
              },
            });
            await tx.orderStatusEvent.create({
              data: {
                orderId,
                fromStatus: OrderStatus.PLACED,
                toStatus: OrderStatus.CANCELLED,
                note: "Order auto-cancelled due to payment/confirmation timeout.",
              },
            });
          });
          this.logger.log(
            `[In-Memory] Stale order ${orderId} auto-cancelled after timeout.`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Error auto-cancelling stale order ${orderId}: ${err.message}`,
        );
      }
    }, delayMinutes * 60 * 1000);

    this.inMemoryTimers.set(jobId, timer);
    this.logger.log(
      `Scheduled in-memory auto-cancel for order ${orderId} after ${delayMinutes}m`,
    );
  }

  /**
   * Schedule repeating batch freshness/spoilage checks every 30 minutes
   */
  async scheduleRepeatingBatchCheck() {
    if (this.batchExpiryQueue) {
      try {
        await this.batchExpiryQueue.add(
          JOB_CHECK_BATCH_EXPIRY,
          {},
          {
            repeat: {
              every: 30 * 60 * 1000,
            },
          },
        );
        this.logger.log(
          "Scheduled repeating batch freshness & spoilage check job via BullMQ",
        );
        return;
      } catch (err: any) {
        this.logger.warn(
          `BullMQ repeat add failed, falling back to in-memory interval: ${err.message}`,
        );
      }
    }

    if (this.batchCheckInterval) return;

    const runBatchAudit = async () => {
      try {
        const now = new Date();
        const approachingExpiry = new Date(now.getTime() + 6 * 3600 * 1000);

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
            `[In-Memory] Batch freshness audit: ${expiredResult.count} batches expired, ${agingResult.count} batches marked aging.`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Error running in-memory batch freshness check: ${err.message}`,
        );
      }
    };

    this.batchCheckInterval = setInterval(runBatchAudit, 30 * 60 * 1000);
    runBatchAudit().catch(() => {});
  }

  onModuleDestroy() {
    for (const timer of this.inMemoryTimers.values()) {
      clearTimeout(timer);
    }
    this.inMemoryTimers.clear();
    if (this.batchCheckInterval) {
      clearInterval(this.batchCheckInterval);
      this.batchCheckInterval = null;
    }
  }
}
