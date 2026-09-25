import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { VerifyPaymentDto } from "./dto/payment.dto";
import { PaymentStatus, PaymentMethod, OrderStatus } from "@prisma/client";
import * as crypto from "crypto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.keyId = this.configService.get<string>("razorpay.keyId", "");
    this.keySecret = this.configService.get<string>("razorpay.keySecret", "");
    this.webhookSecret = this.configService.get<string>(
      "razorpay.webhookSecret",
      "",
    );
  }

  /**
   * Generates Razorpay Order for client checkout
   */
  async createOnlinePaymentOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order || order.customerId !== userId) {
      throw new BadRequestException("Order not found");
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException("Order has already been paid");
    }

    const amountInPaise = Math.round(order.totalAmount * 100);
    const mockRazorpayOrderId = `order_rzp_${Date.now()}_${order.orderNumber}`;

    // Record initial payment transaction in database
    const paymentTx = await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        razorpayOrderId: mockRazorpayOrderId,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.RAZORPAY,
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      amountInPaise,
      currency: "INR",
      razorpayOrderId: mockRazorpayOrderId,
      keyId: this.keyId,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
      },
    };
  }

  /**
   * Verifies Razorpay checkout signature upon payment completion
   */
  async verifyPayment(dto: VerifyPaymentDto, userId: string) {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      dto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.customerId !== userId) {
      throw new BadRequestException("Order not found");
    }

    // In production, verify HMAC SHA256 signature:
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret || "placeholder_secret")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const isDev = this.configService.get<string>("nodeEnv") === "development";
    const isValidSignature = isDev || expectedSignature === razorpaySignature;

    if (!isValidSignature) {
      throw new BadRequestException("Invalid payment signature");
    }

    // Atomic update of transaction and order status
    await this.prisma.$transaction([
      this.prisma.paymentTransaction.updateMany({
        where: { orderId, razorpayOrderId },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      }),
      this.prisma.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: OrderStatus.PLACED,
          toStatus: OrderStatus.CONFIRMED,
          actorId: userId,
          note: `Prepaid online payment confirmed via Razorpay (${razorpayPaymentId}).`,
        },
      }),
    ]);

    return {
      success: true,
      message: "Payment verified and order confirmed successfully",
      orderId,
      paymentId: razorpayPaymentId,
    };
  }

  /**
   * Razorpay Webhook Handler with Idempotency Key check
   */
  async handleRazorpayWebhook(
    rawBody: string,
    signature: string,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const isDuplicate = await this.redis.get(
        `webhook_processed:${idempotencyKey}`,
      );
      if (isDuplicate) {
        this.logger.log(
          `Webhook idempotency: ${idempotencyKey} already processed. Short-circuiting.`,
        );
        return { status: "already_processed" };
      }
    }

    // Validate webhook HMAC signature
    if (this.webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        throw new BadRequestException("Invalid webhook signature");
      }
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const event = payload.event;

    if (event === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        await this.prisma.paymentTransaction.updateMany({
          where: { razorpayOrderId },
          data: {
            razorpayPaymentId,
            status: PaymentStatus.PAID,
          },
        });
      }
    }

    if (idempotencyKey) {
      await this.redis.set(`webhook_processed:${idempotencyKey}`, "1", 86400); // 24h
    }

    return { status: "success" };
  }
}
