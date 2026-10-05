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
import { OrderStatus, Role, User, KycStatus } from "@prisma/client";

const COD_CASH_LIMIT = parseFloat(process.env.COD_CASH_LIMIT || "50000");

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
   * Filtered by Hub Admin's assigned hub
   */
  async getDispatchTower(adminUser?: User) {
    const where: any = {
      status: {
        in: [
          OrderStatus.PLACED,
          OrderStatus.CONFIRMED,
          OrderStatus.CUTTING_PREPARING,
          OrderStatus.PACKED,
          OrderStatus.DISPATCH_READY,
          OrderStatus.ASSIGNED,
          OrderStatus.OUT_FOR_DELIVERY,
        ],
      },
    };

    if (adminUser?.role === Role.ADMIN && adminUser.hubId) {
      where.hubId = adminUser.hubId;
    }

    const queueOrders = await this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: true, cutOption: true } },
        hub: { select: { id: true, name: true, code: true, city: true } },
        deliveryPartner: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { placedAt: "asc" },
    });

    const partnerWhere: any = {
      kycStatus: KycStatus.VERIFIED,
    };
    if (adminUser?.role === Role.ADMIN && adminUser.hubId) {
      partnerWhere.hubId = adminUser.hubId;
    }

    const activePartners = await this.prisma.deliveryPartnerProfile.findMany({
      where: partnerWhere,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        hub: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ isOnline: "desc" }, { rating: "desc" }],
    });

    return {
      queueOrders,
      activePartners: activePartners.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.user.name,
        phone: p.user.phone,
        vehicleType: p.vehicleType,
        isOnline: p.isOnline,
        rating: p.rating,
        currentLat: p.currentLat,
        currentLng: p.currentLng,
        codCashInHand: p.codCashInHand,
        isBlockedByCod: p.codCashInHand >= COD_CASH_LIMIT,
        user: {
          id: p.userId,
          name: p.user.name,
          phone: p.user.phone,
        },
      })),
    };
  }

  /**
   * Offers order to a specific or nearest available delivery partner in the same hub.
   * Enforces 45-second BullMQ acceptance timeout when online.
   */
  async dispatchOrderToPartner(orderId: string, partnerProfileId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: { items: { include: { product: true } }, customer: true, hub: true },
    });

    if (!order) throw new NotFoundException("Order not found");

    let targetPartner;

    if (partnerProfileId) {
      targetPartner = await this.prisma.deliveryPartnerProfile.findFirst({
        where: {
          OR: [
            { id: partnerProfileId },
            { userId: partnerProfileId },
            { partnerId: partnerProfileId },
          ],
        },
        include: { user: true, hub: true },
      });
      if (!targetPartner) {
        throw new NotFoundException("Selected delivery partner not found");
      }
      if (order.hubId && targetPartner.hubId && targetPartner.hubId !== order.hubId) {
        // Automatically sync partner's hub to this order's hub upon manual admin dispatch
        await this.prisma.deliveryPartnerProfile.update({
          where: { id: targetPartner.id },
          data: { hubId: order.hubId },
        });
        targetPartner.hubId = order.hubId;
      }
      if (targetPartner.codCashInHand >= COD_CASH_LIMIT) {
        const formattedLimit = `₹${COD_CASH_LIMIT.toLocaleString("en-IN")}`;
        throw new BadRequestException(
          `Target partner has exceeded the ${formattedLimit} COD limit`,
        );
      }
    } else {
      // Find candidate partners belonging strictly to this order's hub
      const candidateWhere: any = {
        kycStatus: KycStatus.VERIFIED,
        codCashInHand: { lt: COD_CASH_LIMIT },
      };
      if (order.hubId) {
        candidateWhere.hubId = order.hubId;
      }

      // Priority 1: online candidates in the same hub
      let candidates = await this.prisma.deliveryPartnerProfile.findMany({
        where: {
          ...candidateWhere,
          isOnline: true,
        },
        include: { user: true },
        orderBy: { completedDeliveries: "asc" },
      });

      // Priority 2: if no online candidate, find any verified candidate in this hub
      if (candidates.length === 0) {
        candidates = await this.prisma.deliveryPartnerProfile.findMany({
          where: candidateWhere,
          include: { user: true },
          orderBy: { completedDeliveries: "asc" },
        });
      }

      // Priority 3: fallback to any verified candidate in system
      if (candidates.length === 0) {
        candidates = await this.prisma.deliveryPartnerProfile.findMany({
          where: {
            kycStatus: KycStatus.VERIFIED,
            codCashInHand: { lt: COD_CASH_LIMIT },
          },
          include: { user: true },
          orderBy: { completedDeliveries: "asc" },
        });
      }

      if (candidates.length === 0) {
        throw new BadRequestException(
          `No verified delivery partners found for ${order.hub?.name || "this hub"}`,
        );
      }

      targetPartner = candidates[0];
    }

    // Set order to ASSIGNED
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.ASSIGNED,
        deliveryPartnerId: targetPartner.id,
      },
    });

    // Record status event in audit log
    await this.prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: OrderStatus.ASSIGNED,
        actorRole: Role.ADMIN,
        note: `Order assigned to rider ${targetPartner.user.name} (${targetPartner.user.phone})`,
      },
    }).catch(() => {});

    // Send real-time offer to partner's mobile device via Socket
    try {
      this.trackingService.emitNewOrderOffer(targetPartner.userId, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        itemCount: order.items.length,
        earnings: 65,
      });
    } catch (e: any) {
      this.logger.warn(`Could not emit order offer via socket: ${e.message}`);
    }

    // Schedule 180-second acceptance window in BullMQ if partner is online
    if (targetPartner.isOnline) {
      try {
        await this.jobsService.scheduleDispatchTimeout(
          order.id,
          targetPartner.id,
          180,
        );
      } catch (e: any) {
        this.logger.warn(`Could not schedule dispatch timeout: ${e.message}`);
      }
    }

    this.logger.log(
      `Dispatched Order ${order.orderNumber} to partner ${targetPartner.user.name} (online: ${targetPartner.isOnline})`,
    );

    return {
      success: true,
      message: `Order #${order.orderNumber} assigned to ${targetPartner.user.name}${targetPartner.isOnline ? ". Notification sent." : " (Partner offline; waiting in rider queue)." }`,
      partnerId: targetPartner.id,
    };
  }
}
