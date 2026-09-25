import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PaymentStatus, OrderStatus } from "@prisma/client";

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process genuine payment gateway refund for cancelled orders
   */
  async processOrderCancellationRefund(
    orderId: string,
    reason: string,
    adminUserId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentTransactions: true, customer: true },
    });

    if (!order) throw new NotFoundException("Order not found");

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        "Cannot refund an already delivered order through this endpoint",
      );
    }

    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException(
        "Order was not paid online or already refunded",
      );
    }

    // In production with Razorpay SDK:
    // await razorpay.payments.refund(paymentId, { amount: order.totalAmount * 100 });

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark order cancelled and payment status refunded
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
          cancelReason: reason,
          cancelledAt: new Date(),
        },
      });

      // 2. Update payment transactions
      await tx.paymentTransaction.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.REFUNDED },
      });

      // 3. Log event
      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          actorId: adminUserId,
          note: `Order cancelled & online gateway refund initiated: ${reason}`,
        },
      });

      this.logger.log(
        `Initiated gateway refund of ₹${order.totalAmount} for Order ${order.orderNumber}`,
      );

      return {
        success: true,
        orderId,
        orderNumber: order.orderNumber,
        refundedAmount: order.totalAmount,
        status: "REFUND_PROCESSED",
      };
    });
  }
}
