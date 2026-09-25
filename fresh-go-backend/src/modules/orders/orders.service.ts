import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { PricingService } from "../pricing/pricing.service";
import { ZonesService } from "../zones/zones.service";
import { CouponsService } from "../coupons/coupons.service";
import { WalletService } from "../wallet/wallet.service";
import { CartService } from "../cart/cart.service";
import { TrackingService } from "../tracking/tracking.service";
import { JobsService } from "../jobs/jobs.service";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  Role,
  User,
} from "@prisma/client";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.CUTTING_PREPARING, OrderStatus.CANCELLED],
  CUTTING_PREPARING: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  PACKED: [OrderStatus.DISPATCH_READY, OrderStatus.CANCELLED],
  DISPATCH_READY: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  ASSIGNED: [
    OrderStatus.ARRIVED_AT_HUB,
    OrderStatus.DISPATCH_READY,
    OrderStatus.CANCELLED,
  ],
  ARRIVED_AT_HUB: [OrderStatus.PICKED_UP, OrderStatus.DISPATCH_READY],
  PICKED_UP: [OrderStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY],
  FAILED_DELIVERY: [OrderStatus.RETURNED_TO_HUB, OrderStatus.OUT_FOR_DELIVERY],
  RETURNED_TO_HUB: [OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly pricingService: PricingService,
    private readonly zonesService: ZonesService,
    private readonly couponsService: CouponsService,
    private readonly walletService: WalletService,
    private readonly cartService: CartService,
    private readonly trackingService: TrackingService,
    private readonly jobsService: JobsService,
  ) {}

  async getCustomerOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      include: {
        items: { include: { product: true, cutOption: true } },
        deliveryPartner: {
          include: { user: { select: { name: true, phone: true } } },
        },
        statusEvents: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { placedAt: "desc" },
    });
  }

  async getOrderById(orderId: string, user: User) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: true, cutOption: true } },
        deliveryPartner: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        statusEvents: { orderBy: { createdAt: "asc" } },
        zone: true,
      },
    });

    if (!order) throw new NotFoundException("Order not found");

    if (user.role === Role.CUSTOMER && order.customerId !== user.id) {
      throw new BadRequestException("Unauthorized access to this order");
    }

    return order;
  }

  /**
   * Concurrency-safe Order Creation with row-locking on inventory batches
   */
  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
  ) {
    // 1. Validate delivery address and serviceable zone
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });
    if (!address || address.userId !== userId) {
      throw new BadRequestException("Invalid delivery address");
    }

    const zoneCheck = await this.zonesService.findZoneForCoordinates(
      address.latitude,
      address.longitude,
    );
    if (!zoneCheck.serviceable || !zoneCheck.zone) {
      throw new BadRequestException(
        zoneCheck.message || "Address outside serviceable delivery zones",
      );
    }
    const zone = zoneCheck.zone;

    // 2. Resolve items (from DTO or active Redis cart)
    let rawItems = dto.items;
    if (!rawItems || rawItems.length === 0) {
      const activeCart = await this.cartService.getCart(userId);
      if (!activeCart.items || activeCart.items.length === 0) {
        throw new BadRequestException(
          "Cart is empty. Please add products first.",
        );
      }
      rawItems = activeCart.items
        .filter((i) => i != null)
        .map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          cutOptionId: i.cutOption?.id,
        }));
    }

    // 3. Fetch product specs and calculate pricing
    const productIds = rawItems.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { cuts: true },
    });

    const pricingItems = rawItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product)
        throw new NotFoundException(`Product ${item.productId} not found`);

      const cut =
        product.cuts.find((c) => c.id === item.cutOptionId) ||
        product.cuts.find((c) => c.isDefault);
      const grossGrams = 700; // Standard 1kg whole fish equivalent ~700g net, or live weight
      const netGrams = 500;

      return {
        productId: product.id,
        unitPrice: product.basePrice,
        cuttingCharge: cut?.priceModifier || 0,
        quantity: item.quantity,
        cutOptionId: cut?.id,
        grossWeightGrams: grossGrams,
        expectedNetWeightGrams: netGrams,
      };
    });

    const cartPricing = this.pricingService.calculateCartPricing(pricingItems);

    if (cartPricing.subtotal < zone.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount for ${zone.name} is ₹${zone.minOrderAmount}`,
      );
    }

    // Calculate delivery fee (free if subtotal >= freeDeliveryThreshold)
    const deliveryFee =
      cartPricing.subtotal >= zone.freeDeliveryThreshold
        ? 0.0
        : zone.baseDeliveryFee;

    // 4. Validate Coupon if passed
    let discountAmount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const couponValidation = await this.couponsService.validateCoupon(
        dto.couponCode,
        cartPricing.subtotal,
      );
      discountAmount = couponValidation.discountAmount;
      couponId = couponValidation.couponId;
    }

    const finalPricing = this.pricingService.calculateFinalOrderTotal({
      subtotal: cartPricing.subtotal,
      cuttingChargesTotal: cartPricing.cuttingChargesTotal,
      deliveryFee,
      discountAmount,
    });

    // 5. Execute transactional inventory deduction and order creation
    const order = await this.prisma.$transaction(async (tx) => {
      // Deduct stock for each product using raw row-locking: SELECT ... FOR UPDATE
      const allocatedBatches: Record<string, string> = {};
      for (const item of pricingItems) {
        const productObj = products.find((p) => p.id === item.productId);
        const grossKgNeeded =
          productObj?.unit?.toLowerCase() === "kg"
            ? item.quantity
            : (item.grossWeightGrams * item.quantity) / 1000;

        try {
          const allocation = await this.inventoryService.deductStockWithLock(
            tx,
            item.productId,
            grossKgNeeded,
          );
          allocatedBatches[item.productId] = allocation.batchId;
        } catch (err: any) {
          throw new ConflictException(
            `Insufficient stock for "${productObj?.name || 'Product'}". Maximum available stock exceeded.`,
          );
        }
      }

      // Check wallet balance if paying via WALLET
      if (dto.paymentMethod === PaymentMethod.WALLET) {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet || wallet.balance < finalPricing.totalAmount) {
          throw new BadRequestException(
            "Insufficient wallet balance to place order",
          );
        }
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: finalPricing.totalAmount } },
        });
      }

      const orderNumber = `FF${Date.now().toString().slice(-5)}`;

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey: idempotencyKey || null,
          customerId: userId,
          zoneId: zone.id,
          status:
            dto.paymentMethod === PaymentMethod.COD
              ? OrderStatus.CONFIRMED
              : OrderStatus.PLACED,
          subtotal: finalPricing.subtotal,
          cuttingChargesTotal: finalPricing.cuttingChargesTotal,
          deliveryFee: finalPricing.deliveryFee,
          discountAmount: finalPricing.discountAmount,
          couponId,
          totalAmount: finalPricing.totalAmount,
          paymentMethod: dto.paymentMethod,
          paymentStatus:
            dto.paymentMethod === PaymentMethod.WALLET
              ? PaymentStatus.PAID
              : PaymentStatus.PENDING,
          deliveryAddressSnapshotJson: JSON.stringify(address),
          notes: dto.notes,
          confirmedAt:
            dto.paymentMethod === PaymentMethod.COD ? new Date() : null,
          items: {
            create: pricingItems.map((it) => ({
              productId: it.productId,
              cutOptionId: it.cutOptionId,
              batchId: allocatedBatches[it.productId],
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              cuttingCharge: it.cuttingCharge,
              grossWeightGrams: it.grossWeightGrams,
              expectedNetWeightGrams: it.expectedNetWeightGrams,
              subtotal: (it.unitPrice + it.cuttingCharge) * it.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Log initial status event
      await tx.orderStatusEvent.create({
        data: {
          orderId: newOrder.id,
          toStatus: newOrder.status,
          actorId: userId,
          actorRole: Role.CUSTOMER,
          note: `Order placed successfully via ${dto.paymentMethod}.`,
        },
      });

      // Update coupon usage count
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    // 6. Post-transaction async tasks
    await this.cartService.clearCart(userId);

    // Schedule 15-minute auto-cancel timeout if unpaid
    if (order.status === OrderStatus.PLACED) {
      await this.jobsService.scheduleOrderTimeout(order.id, 15);
    }

    // Emit live event to dark store dispatch dashboard
    this.trackingService.emitOrderStatusUpdate(order.id, {
      status: order.status,
      orderNumber: order.orderNumber,
      note: "New order waiting for fulfillment",
    });

    return order;
  }

  /**
   * Enforces strict state machine transitions with OrderStatusEvent audit logging
   * and automatic weight shortfall wallet refunds on PACKED step.
   */
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actor: User,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException("Order not found");

    const currentStatus = order.status;
    const nextStatus = dto.status;

    // Validate Transition against ALLOWED_TRANSITIONS map
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${nextStatus}. Allowed: [${allowed.join(", ")}]`,
      );
    }

    let weightRefundAmount: number | null = null;

    // Execute state transition atomically
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Handling packing scale weight input & shortfall refund
      if (nextStatus === OrderStatus.PACKED && dto.actualPackedWeightGrams) {
        const totalExpectedNetGrams = order.items.reduce(
          (sum, it) => sum + it.expectedNetWeightGrams * it.quantity,
          0,
        );

        if (dto.actualPackedWeightGrams < totalExpectedNetGrams) {
          // Calculate refund proportionally
          const shortfallGrams =
            totalExpectedNetGrams - dto.actualPackedWeightGrams;
          const refundRatio = shortfallGrams / totalExpectedNetGrams;
          weightRefundAmount =
            Math.round(order.subtotal * refundRatio * 100) / 100;

          // Automatically credit customer wallet
          await this.walletService.creditForWeightShortfall(
            order.customerId,
            weightRefundAmount,
            order.id,
            order.orderNumber,
          );
        }
      }

      const updateData: any = {
        status: nextStatus,
        ...(nextStatus === OrderStatus.CONFIRMED
          ? { confirmedAt: new Date() }
          : {}),
        ...(nextStatus === OrderStatus.CUTTING_PREPARING
          ? { preparingAt: new Date() }
          : {}),
        ...(nextStatus === OrderStatus.PACKED
          ? {
              packedAt: new Date(),
              actualPackedWeightGrams: dto.actualPackedWeightGrams || null,
              weightVarianceRefundAmount: weightRefundAmount,
            }
          : {}),
        ...(nextStatus === OrderStatus.OUT_FOR_DELIVERY
          ? { dispatchedAt: new Date() }
          : {}),
        ...(nextStatus === OrderStatus.DELIVERED
          ? {
              deliveredAt: new Date(),
              paymentStatus: PaymentStatus.PAID,
            }
          : {}),
        ...(nextStatus === OrderStatus.CANCELLED
          ? { cancelledAt: new Date() }
          : {}),
      };

      const res = await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          actorId: actor.id,
          actorRole: actor.role,
          note:
            dto.note ||
            (weightRefundAmount
              ? `Packed weight: ${dto.actualPackedWeightGrams}g. Shortfall refund of ₹${weightRefundAmount} credited to customer wallet.`
              : `Order transitioned to ${nextStatus}`),
        },
      });

      return res;
    });

    // Real-time notification broadcast via WebSockets
    this.trackingService.emitOrderStatusUpdate(order.id, {
      status: nextStatus,
      orderNumber: order.orderNumber,
      note: dto.note,
    });

    return updatedOrder;
  }
}
