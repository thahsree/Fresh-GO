import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  QUEUE_DISPATCH,
  QUEUE_ORDER_TIMEOUT,
  QUEUE_BATCH_EXPIRY,
  JOB_DISPATCH_TIMEOUT,
  JOB_CANCEL_STALE_ORDER,
  JOB_CHECK_BATCH_EXPIRY,
} from "./jobs.constants";

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUE_DISPATCH) private readonly dispatchQueue: Queue,
    @InjectQueue(QUEUE_ORDER_TIMEOUT) private readonly orderTimeoutQueue: Queue,
    @InjectQueue(QUEUE_BATCH_EXPIRY) private readonly batchExpiryQueue: Queue,
  ) {}

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
      `Scheduled 45s dispatch timeout for order ${orderId} assigned to partner ${partnerId}`,
    );
  }

  /**
   * Remove dispatch timeout job if partner accepts before timeout expires
   */
  async cancelDispatchTimeout(orderId: string, partnerId: string) {
    const jobId = `dispatch-timeout-${orderId}-${partnerId}`;
    const job = await this.dispatchQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Cancelled dispatch timeout job ${jobId}`);
    }
  }

  /**
   * Auto-cancel unconfirmed order after 15 minutes
   */
  async scheduleOrderTimeout(orderId: string, delayMinutes = 15) {
    const jobId = `order-timeout-${orderId}`;
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
      `Scheduled auto-cancel for order ${orderId} after ${delayMinutes}m`,
    );
  }

  /**
   * Schedule repeating batch freshness/spoilage checks every 30 minutes
   */
  async scheduleRepeatingBatchCheck() {
    await this.batchExpiryQueue.add(
      JOB_CHECK_BATCH_EXPIRY,
      {},
      {
        repeat: {
          every: 30 * 60 * 1000, // Every 30 mins
        },
      },
    );
    this.logger.log("Scheduled repeating batch freshness & spoilage check job");
  }
}
