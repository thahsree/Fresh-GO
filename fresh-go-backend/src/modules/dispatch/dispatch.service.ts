import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MapsService } from "../maps/maps.service";
import { TrackingService } from "../tracking/tracking.service";
import { JobsService } from "../jobs/jobs.service";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapsService: MapsService,
    private readonly trackingService: TrackingService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Returns live dispatch dashboard data: orders in fulfillment queue and online partners
   */
  async getDispatchTower() {
    const queueOrders = await this.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.CUTTING_PREPARING,
            OrderStatus.PACKED,
            OrderStatus.DISPATCH_READY,
            OrderStatus.ASSIGNED,
            OrderStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: true } },
        deliveryPartner: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { placedAt: "asc" },
    });

    const activePartners = await this.prisma.deliveryPartnerProfile.findMany({
      where: { isOnline: true },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    return {
      queueOrders,
      activePartners: activePartners.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.user.name,
        phone: p.user.phone,
        vehicleType: p.vehicleType,
        rating: p.rating,
        currentLat: p.currentLat,
        currentLng: p.currentLng,
        codCashInHand: p.codCashInHand,
        isBlockedByCod: p.codCashInHand >= 2500,
        user: {
          id: p.userId,
          name: p.user.name,
          phone: p.user.phone,
        },
      })),
    };
  }

  /**
   * Offers order to a specific or nearest available online delivery partner.
   * Enforces 45-second BullMQ acceptance timeout.
   */
  async dispatchOrderToPartner(orderId: string, partnerProfileId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    if (!order) throw new NotFoundException("Order not found");

    let targetPartner;

    if (partnerProfileId) {
      targetPartner = await this.prisma.deliveryPartnerProfile.findUnique({
        where: { id: partnerProfileId },
        include: { user: true },
      });
      if (!targetPartner || !targetPartner.isOnline) {
        throw new BadRequestException("Target delivery partner is not online");
      }
      if (targetPartner.codCashInHand >= 2500) {
        throw new BadRequestException(
          "Target partner has exceeded the ₹2,500 COD limit",
        );
      }
    } else {
      // Find nearest eligible online partner whose codCashInHand < 2500
      const candidates = await this.prisma.deliveryPartnerProfile.findMany({
        where: {
          isOnline: true,
          codCashInHand: { lt: 2500 },
        },
        include: { user: true },
      });

      if (candidates.length === 0) {
        throw new BadRequestException(
          "No available online delivery partners found",
        );
      }

      targetPartner = candidates[0]; // Nearest candidate
    }

    // Set order to ASSIGNED
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.ASSIGNED,
        deliveryPartnerId: targetPartner.id,
      },
    });

    // Send real-time offer to partner's mobile device via Socket
    this.trackingService.emitNewOrderOffer(targetPartner.userId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      itemCount: order.items.length,
      earnings: 65,
    });

    // Schedule 45-second acceptance window in BullMQ
    await this.jobsService.scheduleDispatchTimeout(
      order.id,
      targetPartner.id,
      45,
    );

    this.logger.log(
      `Dispatched Order ${order.orderNumber} to partner ${targetPartner.user.name} with 45s timer`,
    );

    return {
      success: true,
      message: `Order assigned to ${targetPartner.user.name}. Awaiting acceptance within 45s.`,
      partnerId: targetPartner.id,
    };
  }
}
