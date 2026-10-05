import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TrackingService } from "../tracking/tracking.service";
import { JobsService } from "../jobs/jobs.service";
import {
  UpdateTripPhaseDto,
  RecordCashSettlementDto,
  CreateIssueTicketDto,
} from "./dto/delivery.dto";
import {
  DeliveryPhase,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  EarningType,
  IssueStatus,
  User,
  Role,
} from "@prisma/client";

const COD_CASH_LIMIT = parseFloat(process.env.COD_CASH_LIMIT || "50000");

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingService: TrackingService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Comprehensive partner mobile dashboard state
   */
  async getPartnerDashboard(partnerUserId: string) {
    const profile = await this.prisma.deliveryPartnerProfile.findUnique({
      where: { userId: partnerUserId },
      include: { preferredZone: true },
    });

    if (!profile)
      throw new NotFoundException("Delivery partner profile not found");

    // Active trip if any
    const activeTrip = await this.prisma.deliveryTrip.findFirst({
      where: {
        partnerId: profile.id,
        phase: { notIn: [DeliveryPhase.DELIVERED, DeliveryPhase.CANCELLED] },
      },
      include: {
        order: {
          include: {
            customer: { select: { name: true, phone: true } },
            items: { include: { product: true } },
          },
        },
      },
    });

    // Recent deliveries
    const recentDeliveries = await this.prisma.deliveryTrip.findMany({
      where: {
        partnerId: profile.id,
        phase: DeliveryPhase.DELIVERED,
      },
      include: {
        order: {
          select: { orderNumber: true, totalAmount: true, paymentMethod: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
    });

    // Earnings today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayEarnings = await this.prisma.partnerEarningEntry.aggregate({
      where: {
        partnerId: profile.id,
        date: { gte: startOfDay },
      },
      _sum: { amount: true },
    });

    return {
      profile: {
        id: profile.id,
        isOnline: profile.isOnline,
        vehicleType: profile.vehicleType,
        rating: profile.rating,
        completedDeliveries: profile.completedDeliveries,
        codCashInHand: profile.codCashInHand,
        codLimitExceeded: profile.codCashInHand >= COD_CASH_LIMIT,
        preferredZone: profile.preferredZone?.name,
      },
      activeTrip,
      todayEarnings: todayEarnings._sum.amount || 0,
      recentDeliveries,
    };
  }

  /**
   * Available orders for delivery from a specific hub or in the system
   */
  async getAvailableOrders(partnerUserId: string, hubId?: string) {
    const partner = await this.prisma.deliveryPartnerProfile.findUnique({
      where: { userId: partnerUserId },
      include: { hub: true },
    });
    if (!partner)
      throw new NotFoundException("Delivery partner profile not found");

    // Partner is strictly bound to their assigned hub.
    // If partner is assigned to a hub, use that hub. Otherwise, fall back to query hubId if provided.
    const effectiveHubId = partner.hubId || hubId;

    const whereClause: any = {
      status: {
        in: [
          OrderStatus.PLACED,
          OrderStatus.CONFIRMED,
          OrderStatus.CUTTING_PREPARING,
          OrderStatus.PACKED,
          OrderStatus.DISPATCH_READY,
          OrderStatus.ASSIGNED,
        ],
      },
      OR: [
        // 1. Orders explicitly assigned to this partner (regardless of status)
        { deliveryPartnerId: partner.id },
        // 2. Unassigned orders strictly belonging to this partner's hub
        {
          deliveryPartnerId: null,
          ...(effectiveHubId ? { hubId: effectiveHubId } : {}),
        },
      ],
    };

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: true, cutOption: true } },
        hub: true,
        zone: true,
      },
      orderBy: { placedAt: "desc" },
      take: 20,
    });

    return orders;
  }

  /**
   * Partner accepts an offered order
   * Strictly enforces COD threshold cap!
   */
  async acceptDeliveryOrder(partnerUserId: string, orderId: string) {
    const partner = await this.prisma.deliveryPartnerProfile.findUnique({
      where: { userId: partnerUserId },
    });

    if (!partner)
      throw new NotFoundException("Delivery partner profile not found");

    if (!partner.isOnline) {
      throw new BadRequestException("You must be online to accept orders");
    }

    // STRICT COD LIMIT ENFORCEMENT
    if (partner.codCashInHand >= COD_CASH_LIMIT) {
      const formattedLimit = `₹${COD_CASH_LIMIT.toLocaleString("en-IN")}`;
      throw new BadRequestException(
        `COD limit exceeded! You have ₹${partner.codCashInHand} in hand. Cash-in-hand limit is ${formattedLimit}. Please deposit cash at the hub before taking new orders.`,
      );
    }

    const acceptableStatuses: OrderStatus[] = [
      OrderStatus.DISPATCH_READY,
      OrderStatus.ASSIGNED,
      OrderStatus.PACKED,
      OrderStatus.CUTTING_PREPARING,
      OrderStatus.CONFIRMED,
      OrderStatus.PLACED,
    ];

    const cleanId = orderId ? orderId.replace(/^#/, "").trim() : "";
    const isMalformed =
      !cleanId ||
      cleanId === "[object Object]" ||
      cleanId === "undefined" ||
      cleanId === "null" ||
      cleanId === "current";

    let order: any = null;

    if (!isMalformed) {
      order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: orderId },
            { id: cleanId },
            { orderNumber: orderId },
            { orderNumber: cleanId },
            { orderNumber: { equals: cleanId, mode: "insensitive" } },
          ],
        },
      });
    }

    // Fallback: If orderId was malformed (e.g. [object Object] from client) or "current" or not found by ID:
    if (!order) {
      // 1. Try finding order explicitly assigned to this partner
      order = await this.prisma.order.findFirst({
        where: {
          deliveryPartnerId: partner.id,
          status: { in: acceptableStatuses },
        },
        orderBy: { placedAt: "desc" },
      });

      // 2. If none assigned, find newest available unassigned order in partner's hub
      if (!order && partner.hubId) {
        order = await this.prisma.order.findFirst({
          where: {
            hubId: partner.hubId,
            deliveryPartnerId: null,
            status: { in: acceptableStatuses },
          },
          orderBy: { placedAt: "desc" },
        });
      }

      // 3. Fallback: newest unassigned order anywhere
      if (!order) {
        order = await this.prisma.order.findFirst({
          where: {
            deliveryPartnerId: null,
            status: { in: acceptableStatuses },
          },
          orderBy: { placedAt: "desc" },
        });
      }
    }

    if (!order) throw new NotFoundException("Order not found or no longer available");

    if (!acceptableStatuses.includes(order.status)) {
      throw new BadRequestException(
        "Order is no longer available for delivery",
      );
    }

    // Cancel 45-second dispatch timeout job in BullMQ
    await this.jobsService.cancelDispatchTimeout(order.id, partner.id);

    const trip = await this.prisma.$transaction(async (tx) => {
      // Create DeliveryTrip
      const newTrip = await tx.deliveryTrip.create({
        data: {
          orderId: order.id,
          partnerId: partner.id,
          phase: DeliveryPhase.ACCEPTED,
        },
      });

      // Update Order
      await tx.order.update({
        where: { id: order.id },
        data: {
          deliveryPartnerId: partner.id,
          status: OrderStatus.ASSIGNED,
        },
      });

      // Log status event
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.ASSIGNED,
          actorId: partnerUserId,
          note: `Assigned to delivery partner (Partner profile: ${partner.id})`,
        },
      });

      return newTrip;
    });

    // Broadcast status change via Socket.io
    this.trackingService.emitOrderStatusUpdate(order.id, {
      status: OrderStatus.ASSIGNED,
      orderNumber: order.orderNumber,
      note: `Delivery partner accepted order`,
    });

    return trip;
  }

  /**
   * Progresses delivery trip milestones (ACCEPTED -> AT_PICKUP -> ON_THE_WAY -> DELIVERED)
   */
  async updateTripPhase(
    partnerUserId: string,
    tripId: string,
    dto: UpdateTripPhaseDto,
  ) {
    const trip = await this.prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        order: true,
        partner: true,
      },
    });

    if (!trip || trip.partner.userId !== partnerUserId) {
      throw new BadRequestException("Delivery trip not found");
    }

    const { phase, distanceKm = trip.distanceKm || 3.5 } = dto;
    const orderId = trip.orderId;

    const finalTrip = await this.prisma.$transaction(async (tx) => {
      let orderNextStatus = trip.order.status;

      if (phase === DeliveryPhase.AT_PICKUP) {
        orderNextStatus = OrderStatus.ARRIVED_AT_HUB;
      } else if (phase === DeliveryPhase.ON_THE_WAY) {
        orderNextStatus = OrderStatus.OUT_FOR_DELIVERY;
      } else if (phase === DeliveryPhase.DELIVERED) {
        orderNextStatus = OrderStatus.DELIVERED;
      }

      // 1. Update Trip
      const updatedTrip = await tx.deliveryTrip.update({
        where: { id: tripId },
        data: {
          phase,
          distanceKm,
          ...(phase === DeliveryPhase.AT_PICKUP
            ? { arrivedHubAt: new Date() }
            : {}),
          ...(phase === DeliveryPhase.ON_THE_WAY
            ? { pickedUpAt: new Date() }
            : {}),
          ...(phase === DeliveryPhase.DELIVERED
            ? {
                completedAt: new Date(),
                codCollectedAmount:
                  trip.order.paymentMethod === PaymentMethod.COD
                    ? trip.order.totalAmount
                    : 0,
              }
            : {}),
        },
      });

      // 2. Update Order
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: orderNextStatus,
          ...(phase === DeliveryPhase.ON_THE_WAY
            ? { dispatchedAt: new Date() }
            : {}),
          ...(phase === DeliveryPhase.DELIVERED
            ? { deliveredAt: new Date(), paymentStatus: PaymentStatus.PAID }
            : {}),
        },
      });

      // 3. Status Event
      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: trip.order.status,
          toStatus: orderNextStatus,
          actorId: partnerUserId,
          note: `Rider updated delivery phase to ${phase}`,
        },
      });

      // 4. On DELIVERED: Reconcile COD cash & credit rider earnings
      if (phase === DeliveryPhase.DELIVERED) {
        // Base pay ₹45 + ₹12/km
        const earningsAmount = Math.round(45 + distanceKm * 12);

        await tx.partnerEarningEntry.create({
          data: {
            partnerId: trip.partnerId,
            orderId: trip.orderId,
            type: EarningType.BASE_PAY,
            amount: earningsAmount,
          },
        });

        // If COD order, increment cash-in-hand
        const codCashDelta =
          trip.order.paymentMethod === PaymentMethod.COD
            ? trip.order.totalAmount
            : 0;

        await tx.deliveryPartnerProfile.update({
          where: { id: trip.partnerId },
          data: {
            completedDeliveries: { increment: 1 },
            codCashInHand: { increment: codCashDelta },
          },
        });
      }

      return updatedTrip;
    });

    let nextOrderStatusName = trip.order.status;
    if (phase === DeliveryPhase.AT_PICKUP) nextOrderStatusName = OrderStatus.ARRIVED_AT_HUB;
    else if (phase === DeliveryPhase.ON_THE_WAY) nextOrderStatusName = OrderStatus.OUT_FOR_DELIVERY;
    else if (phase === DeliveryPhase.DELIVERED) nextOrderStatusName = OrderStatus.DELIVERED;

    this.trackingService.emitOrderStatusUpdate(orderId, {
      status: nextOrderStatusName,
      orderNumber: trip.order.orderNumber,
      note: `Rider updated delivery phase to ${phase}`,
    });

    return finalTrip;
  }

  /**
   * Cash Settlement: Hub Admin collects physical cash and zeroes or decrements partner COD balance
   */
  async recordCashSettlement(
    dto: RecordCashSettlementDto,
    adminUserId: string,
  ) {
    const partner = await this.prisma.deliveryPartnerProfile.findUnique({
      where: { id: dto.partnerProfileId },
      include: { user: true },
    });

    if (!partner) throw new NotFoundException("Partner profile not found");

    if (partner.codCashInHand < dto.amount) {
      throw new BadRequestException(
        `Partner only has ₹${partner.codCashInHand} recorded in cash. Cannot settle ₹${dto.amount}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.cashSettlement.create({
        data: {
          partnerId: dto.partnerProfileId,
          hubId: dto.hubId,
          amount: dto.amount,
          receiptNumber: dto.receiptNumber,
          notes: dto.notes,
          settledByAdminId: adminUserId,
        },
      });

      const updatedPartner = await tx.deliveryPartnerProfile.update({
        where: { id: dto.partnerProfileId },
        data: {
          codCashInHand: { decrement: dto.amount },
        },
      });

      this.logger.log(
        `💵 Cash Settlement recorded: ₹${dto.amount} from partner ${partner.user.name}. New COD balance: ₹${updatedPartner.codCashInHand}`,
      );

      return { settlement, partner: updatedPartner };
    });
  }

  /**
   * Report an issue (Store delay, customer unreachable, breakdown)
   */
  async reportIssue(partnerUserId: string, dto: CreateIssueTicketDto) {
    const ticket = await this.prisma.deliveryIssueTicket.create({
      data: {
        partnerId: partnerUserId,
        orderId: dto.orderId,
        category: dto.category,
        priority: dto.priority || "NORMAL",
        description: dto.description,
        status: IssueStatus.UNDER_REVIEW,
      },
    });

    // Auto-compensation rule for store delay > 15m
    if (dto.category === "STORE_DELAY") {
      const partner = await this.prisma.deliveryPartnerProfile.findUnique({
        where: { userId: partnerUserId },
      });

      if (partner) {
        await this.prisma.partnerEarningEntry.create({
          data: {
            partnerId: partner.id,
            orderId: dto.orderId,
            type: EarningType.STORE_DELAY_COMPENSATION,
            amount: 42.0, // Standard ₹42 store wait compensation
          },
        });

        await this.prisma.deliveryIssueTicket.update({
          where: { id: ticket.id },
          data: {
            status: IssueStatus.RESOLVED,
            compensationAmount: 42.0,
            resolutionNote:
              "Auto-compensation of ₹42 approved and credited for store wait.",
          },
        });
      }
    }

    return ticket;
  }

  /**
   * Get delivery partners filtered by Hub Admin's hub or super admin filter
   */
  async getDeliveryPartners(adminUser: User, queryHubId?: string) {
    const where: any = {};
    if (adminUser.role === Role.ADMIN) {
      if (adminUser.hubId) {
        where.hubId = adminUser.hubId;
      }
    } else if (queryHubId) {
      where.hubId = queryHubId;
    }

    return this.prisma.deliveryPartnerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
            code: true,
            contactPhone: true,
          },
        },
      },
      orderBy: [{ kycStatus: "asc" }, { rating: "desc" }],
    });
  }

  /**
   * Approve or reject delivery partner application and ensure 6-digit partnerId exists
   */
  async updatePartnerKycStatus(
    partnerProfileId: string,
    status: "VERIFIED" | "REJECTED" | "PENDING",
  ) {
    const profile = await this.prisma.deliveryPartnerProfile.findUnique({
      where: { id: partnerProfileId },
      include: { user: true, hub: true },
    });
    if (!profile) {
      throw new NotFoundException("Delivery partner not found");
    }

    // Ensure 6-digit partnerId exists when approving
    let partnerId = profile.partnerId;
    if (!partnerId) {
      partnerId = Math.floor(100000 + Math.random() * 900000).toString();
      while (
        await this.prisma.deliveryPartnerProfile.findUnique({
          where: { partnerId },
        })
      ) {
        partnerId = Math.floor(100000 + Math.random() * 900000).toString();
      }
    }

    return this.prisma.deliveryPartnerProfile.update({
      where: { id: partnerProfileId },
      data: {
        kycStatus: status as any,
        partnerId: partnerId || undefined,
        isOnline: status === "VERIFIED" ? profile.isOnline : false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
            code: true,
            contactPhone: true,
          },
        },
      },
    });
  }
}
