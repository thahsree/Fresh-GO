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
    let activeTrip = await this.prisma.deliveryTrip.findFirst({
      where: {
        partnerId: profile.id,
        phase: { notIn: [DeliveryPhase.DELIVERED, DeliveryPhase.CANCELLED] },
      },
      include: {
        order: {
          include: {
            customer: { select: { name: true, phone: true } },
            items: { include: { product: true } },
            hub: true,
          },
        },
      },
    });

    let cancelledTrip: any = null;

    if (activeTrip && activeTrip.order.status === OrderStatus.CANCELLED) {
      cancelledTrip = {
        orderId: activeTrip.orderId,
        orderNumber: activeTrip.order.orderNumber,
        cancelReason:
          activeTrip.order.cancelReason ||
          activeTrip.order.notes ||
          "Cancelled from Admin Control Tower",
        cancelledAt: activeTrip.order.cancelledAt || new Date(),
      };
      // Mark trip as CANCELLED so it is recorded in history
      await this.prisma.deliveryTrip.update({
        where: { id: activeTrip.id },
        data: { phase: DeliveryPhase.CANCELLED },
      });
      activeTrip = null;
    }

    // CRITICAL: If the order was already DELIVERED (e.g. from another trip or completed earlier),
    // close this trip immediately and do not return it as active!
    if (activeTrip && activeTrip.order.status === OrderStatus.DELIVERED) {
      await this.prisma.deliveryTrip.update({
        where: { id: activeTrip.id },
        data: { phase: DeliveryPhase.DELIVERED, completedAt: new Date() },
      });
      activeTrip = null;
    }

    // Recent deliveries and trip history (both DELIVERED and CANCELLED)
    const recentDeliveries = await this.prisma.deliveryTrip.findMany({
      where: {
        partnerId: profile.id,
        phase: { in: [DeliveryPhase.DELIVERED, DeliveryPhase.CANCELLED] },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            paymentMethod: true,
            status: true,
            cancelReason: true,
            notes: true,
            deliveryAddressSnapshotJson: true,
            hub: { select: { name: true } },
          },
        },
      },
      orderBy: { acceptedAt: "desc" },
      take: 40,
    });

    // Deduplicate by orderId so each delivered/cancelled order appears ONLY ONCE in history
    const seenOrderIds = new Set<string>();
    const uniqueRecentDeliveries = recentDeliveries.filter((d) => {
      const oId = d.orderId || d.order?.id;
      if (!oId || seenOrderIds.has(oId)) return false;
      seenOrderIds.add(oId);
      return true;
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
      cancelledTrip,
      todayEarnings: todayEarnings._sum.amount || 0,
      recentDeliveries: uniqueRecentDeliveries,
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
      // Exclude ANY order that already has an active or completed delivery trip!
      deliveryTrips: {
        none: {
          phase: { notIn: [DeliveryPhase.CANCELLED] },
        },
      },
      OR: [
        // 1. Orders explicitly assigned to this partner that haven't been accepted into a trip yet
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

    if (!acceptableStatuses.includes(order.status) || order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        "Order is no longer available for delivery",
      );
    }

    // 1. If this partner already has an active trip, prevent accepting another
    const existingPartnerTrip = await this.prisma.deliveryTrip.findFirst({
      where: {
        partnerId: partner.id,
        phase: { notIn: [DeliveryPhase.DELIVERED, DeliveryPhase.CANCELLED] },
      },
      include: { order: true },
    });

    if (existingPartnerTrip) {
      if (existingPartnerTrip.orderId === order.id) {
        return existingPartnerTrip; // Idempotent return if already accepted
      }
      throw new BadRequestException("You already have an active delivery trip in progress. Complete it first.");
    }

    // 2. If this order already has any active or completed trip, prevent creating duplicate trip
    const existingOrderTrip = await this.prisma.deliveryTrip.findFirst({
      where: {
        orderId: order.id,
        phase: { notIn: [DeliveryPhase.CANCELLED] },
      },
    });

    if (existingOrderTrip) {
      if (existingOrderTrip.partnerId === partner.id && existingOrderTrip.phase !== DeliveryPhase.DELIVERED) {
        return existingOrderTrip; // Idempotent return
      }
      throw new BadRequestException("This order already has an active trip or has already been delivered.");
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
        // Also ensure any other duplicate or orphaned trips for this order are completed
        await tx.deliveryTrip.updateMany({
          where: {
            orderId,
            id: { not: tripId },
          },
          data: {
            phase: DeliveryPhase.DELIVERED,
            completedAt: new Date(),
          },
        });

        // Only credit earnings and increment COD cash IF not already credited for this order!
        const existingEarning = await tx.partnerEarningEntry.findFirst({
          where: {
            orderId: trip.orderId,
            partnerId: trip.partnerId,
          },
        });

        if (!existingEarning) {
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
          const isCodOrder =
            String(trip.order.paymentMethod || "").toUpperCase() === "COD" ||
            trip.order.paymentMethod === PaymentMethod.COD;
          const codCashDelta = isCodOrder ? trip.order.totalAmount : 0;

          await tx.deliveryPartnerProfile.update({
            where: { id: trip.partnerId },
            data: {
              completedDeliveries: { increment: 1 },
              codCashInHand: { increment: codCashDelta },
            },
          });
        }
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
      include: { user: true, hub: true },
    });

    if (!partner) throw new NotFoundException("Partner profile not found");

    const settleAmount =
      dto.amount && dto.amount > 0 ? dto.amount : partner.codCashInHand;

    if (settleAmount <= 0) {
      return {
        message: `${partner.user.name} currently has no cash in hand to settle.`,
        partner,
        clearedAmount: 0,
      };
    }

    if (partner.codCashInHand < settleAmount) {
      throw new BadRequestException(
        `Partner only has ₹${partner.codCashInHand} recorded in cash. Cannot settle ₹${settleAmount}.`,
      );
    }

    const hubId =
      dto.hubId ||
      partner.hubId ||
      (await this.prisma.hub.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { id: true } }))?.id;

    if (!hubId) throw new BadRequestException("No fulfillment hub found for settlement");

    const receiptNumber =
      dto.receiptNumber ||
      `CS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.cashSettlement.create({
        data: {
          partnerId: dto.partnerProfileId,
          hubId,
          amount: settleAmount,
          receiptNumber,
          notes: dto.notes || `Counter cash collected by Admin`,
          settledByAdminId: adminUserId,
        },
      });

      const updatedPartner = await tx.deliveryPartnerProfile.update({
        where: { id: dto.partnerProfileId },
        data: {
          codCashInHand: { decrement: settleAmount },
        },
        include: { user: true, hub: true },
      });

      this.logger.log(
        `💵 Cash Settlement recorded: ₹${settleAmount} from partner ${partner.user.name}. New COD balance: ₹${updatedPartner.codCashInHand}`,
      );

      return {
        success: true,
        message: `Settled ₹${settleAmount.toLocaleString("en-IN")} from ${partner.user.name}. New balance: ₹${updatedPartner.codCashInHand.toLocaleString("en-IN")}`,
        settlement,
        partner: updatedPartner,
        clearedAmount: settleAmount,
      };
    });
  }

  /**
   * Fast Hub Admin Action: Clear or settle cash in hand for a delivery partner
   */
  async clearPartnerCash(
    partnerProfileId: string,
    adminUser: User,
    amount?: number,
    notes?: string,
  ) {
    const partner = await this.prisma.deliveryPartnerProfile.findFirst({
      where: {
        OR: [
          { id: partnerProfileId },
          { userId: partnerProfileId },
          { partnerId: partnerProfileId },
        ],
      },
      include: { user: true, hub: true },
    });

    if (!partner) throw new NotFoundException("Delivery partner profile not found");

    if (partner.codCashInHand <= 0) {
      return {
        success: true,
        message: `${partner.user.name} has no cash in hand (₹0 balance).`,
        partner,
        clearedAmount: 0,
      };
    }

    const settleAmount =
      amount && amount > 0
        ? Math.min(amount, partner.codCashInHand)
        : partner.codCashInHand;

    const hubId =
      partner.hubId ||
      adminUser.hubId ||
      (await this.prisma.hub.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { id: true } }))?.id;

    if (!hubId) throw new BadRequestException("No fulfillment hub found for settlement");

    const receiptNumber = `CS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.cashSettlement.create({
        data: {
          partnerId: partner.id,
          hubId,
          amount: settleAmount,
          receiptNumber,
          notes: notes || `Cash cleared at counter by ${adminUser.name || "Hub Admin"}`,
          settledByAdminId: adminUser.id,
        },
      });

      const updatedPartner = await tx.deliveryPartnerProfile.update({
        where: { id: partner.id },
        data: {
          codCashInHand: { decrement: settleAmount },
        },
        include: { user: true, hub: true },
      });

      this.logger.log(
        `💵 Cleared COD cash: ₹${settleAmount} from rider ${partner.user.name}. Remaining COD cash: ₹${updatedPartner.codCashInHand}`,
      );

      return {
        success: true,
        message: `Cleared ₹${settleAmount.toLocaleString("en-IN")} from ${partner.user.name}. New balance: ₹${updatedPartner.codCashInHand.toLocaleString("en-IN")}`,
        settlement,
        partner: updatedPartner,
        clearedAmount: settleAmount,
      };
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
    const effectiveHubId = queryHubId || adminUser.hubId;

    if (effectiveHubId) {
      where.hubId = effectiveHubId;
    } else if (adminUser.role !== Role.SUPER_ADMIN) {
      // For Admin / Hub Manager without explicit hubId, fallback to central hub
      const defaultHub = await this.prisma.hub.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      if (defaultHub) {
        where.hubId = defaultHub.id;
      }
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

  /**
   * Delete a delivery partner and clean up all associated records
   */
  async deleteDeliveryPartner(partnerProfileId: string, adminUser: User) {
    const profile = await this.prisma.deliveryPartnerProfile.findFirst({
      where: {
        OR: [
          { id: partnerProfileId },
          { userId: partnerProfileId },
          { partnerId: partnerProfileId },
        ],
      },
      include: { user: true },
    });
    if (!profile) {
      throw new NotFoundException("Delivery partner not found");
    }

    // Hub admin can only delete partners registered to their own hub; Super Admin can delete any
    if (
      adminUser.role !== Role.SUPER_ADMIN &&
      adminUser.hubId &&
      profile.hubId &&
      profile.hubId !== adminUser.hubId
    ) {
      throw new BadRequestException(
        "You can only delete delivery partners registered to your hub."
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Unlink any assigned orders
      await tx.order.updateMany({
        where: { deliveryPartnerId: profile.id },
        data: { deliveryPartnerId: null },
      });

      // 2. Delete delivery trips
      await tx.deliveryTrip.deleteMany({
        where: { partnerId: profile.id },
      });

      // 3. Delete cash settlements
      await tx.cashSettlement.deleteMany({
        where: { partnerId: profile.id },
      });

      // 4. Delete partner earning entries
      await tx.partnerEarningEntry.deleteMany({
        where: { partnerId: profile.id },
      });

      // 5. Delete issue tickets reported by this rider
      await tx.deliveryIssueTicket.deleteMany({
        where: { partnerId: profile.userId },
      });

      // 6. Delete delivery partner profile
      await tx.deliveryPartnerProfile.delete({
        where: { id: profile.id },
      });

      // 7. Delete the user account
      await tx.user.delete({
        where: { id: profile.userId },
      });

      return {
        success: true,
        message: `Delivery partner "${profile.user?.name || profile.partnerId || "Rider"}" deleted successfully.`,
      };
    });
  }
}
