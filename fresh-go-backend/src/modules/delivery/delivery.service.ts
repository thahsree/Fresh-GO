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
} from "@prisma/client";

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
        codLimitExceeded: profile.codCashInHand >= 2500,
        preferredZone: profile.preferredZone?.name,
      },
      activeTrip,
      todayEarnings: todayEarnings._sum.amount || 0,
      recentDeliveries,
    };
  }

  /**
   * Partner accepts an offered order
   * Strictly enforces ₹2,500 COD threshold cap!
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
    if (partner.codCashInHand >= 2500) {
      throw new BadRequestException(
        `COD limit exceeded! You have ₹${partner.codCashInHand} in hand. Cash-in-hand limit is ₹2,500. Please deposit cash at the hub before taking new orders.`,
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Order not found");

    if (
      order.status !== OrderStatus.DISPATCH_READY &&
      order.status !== OrderStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        "Order is no longer available for delivery",
      );
    }

    // Cancel 45-second dispatch timeout job in BullMQ
    await this.jobsService.cancelDispatchTimeout(orderId, partner.id);

    return this.prisma.$transaction(async (tx) => {
      // Create DeliveryTrip
      const trip = await tx.deliveryTrip.create({
        data: {
          orderId,
          partnerId: partner.id,
          phase: DeliveryPhase.ACCEPTED,
        },
      });

      // Update Order
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: partner.id,
          status: OrderStatus.ASSIGNED,
        },
      });

      // Log status event
      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.ASSIGNED,
          actorId: partnerUserId,
          note: `Assigned to delivery partner (Partner profile: ${partner.id})`,
        },
      });

      return trip;
    });
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

    return this.prisma.$transaction(async (tx) => {
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
}
