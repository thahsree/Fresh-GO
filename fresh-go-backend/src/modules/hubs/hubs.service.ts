import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  CreateHubDto,
  UpdateHubDto,
  CheckServiceabilityDto,
  NotifyInterestDto,
} from "./dto/hubs.dto";
import { Role } from "@prisma/client";

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class HubsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHubs(options?: { includeInactive?: boolean }) {
    const hubs = await this.prisma.hub.findMany({
      where: options?.includeInactive ? {} : { isActive: true },
      include: {
        admins: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            orders: true,
            batches: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return hubs.map((h) => ({
      ...h,
      adminCount: h.admins.length,
      primaryAdmin: h.admins[0] || null,
    }));
  }

  async getHubById(id: string) {
    const hub = await this.prisma.hub.findUnique({
      where: { id },
      include: {
        admins: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
        orders: {
          take: 10,
          orderBy: { placedAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            placedAt: true,
          },
        },
        batches: {
          take: 10,
          where: { isActive: true },
          select: {
            id: true,
            batchNumber: true,
            remainingQuantityKg: true,
            freshnessStatus: true,
          },
        },
      },
    });

    if (!hub) throw new NotFoundException(`Hub with ID ${id} not found`);
    return hub;
  }

  async createHub(dto: CreateHubDto) {
    // Generate code if not provided
    let code = dto.code;
    if (!code) {
      const cityPrefix = (dto.city || "HUB").slice(0, 3).toUpperCase();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      code = `HUB-${cityPrefix}-${randomSuffix}`;
    }

    // Check code uniqueness
    const existing = await this.prisma.hub.findUnique({ where: { code } });
    if (existing) {
      code = `${code}-${Date.now().toString().slice(-4)}`;
    }

    const hub = await this.prisma.hub.create({
      data: {
        name: dto.name,
        code,
        address: dto.address,
        city: dto.city || dto.name.split(" ")[0] || "Hub City",
        latitude: Number(dto.latitude),
        longitude: Number(dto.longitude),
        deliveryRadiusKm: dto.deliveryRadiusKm ? Number(dto.deliveryRadiusKm) : 10.0,
        isActive: dto.isActive ?? true,
        contactPhone: dto.contactPhone,
      },
    });

    // If an Admin Phone is specified, automatically format Hub Admin name with the hub location name
    if (dto.adminPhone && dto.adminPhone.trim().length > 0) {
      const adminName =
        dto.adminName && dto.adminName.trim().length > 0
          ? dto.adminName.trim()
          : `${dto.name} Admin`;

      await this.prisma.user.upsert({
        where: { phone: dto.adminPhone.trim() },
        update: {
          name: adminName,
          role: Role.ADMIN,
          hubId: hub.id,
          email: dto.adminEmail || undefined,
        },
        create: {
          phone: dto.adminPhone.trim(),
          name: adminName,
          email: dto.adminEmail || undefined,
          role: Role.ADMIN,
          hubId: hub.id,
        },
      });
    }

    return this.getHubById(hub.id);
  }

  async updateHub(id: string, dto: UpdateHubDto) {
    const existing = await this.prisma.hub.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Hub with ID ${id} not found`);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.latitude !== undefined) updateData.latitude = Number(dto.latitude);
    if (dto.longitude !== undefined) updateData.longitude = Number(dto.longitude);
    if (dto.deliveryRadiusKm !== undefined)
      updateData.deliveryRadiusKm = Number(dto.deliveryRadiusKm);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.contactPhone !== undefined) updateData.contactPhone = dto.contactPhone;

    const updated = await this.prisma.hub.update({
      where: { id },
      data: updateData,
    });

    // Update or assign admin if phone provided
    if (dto.adminPhone && dto.adminPhone.trim().length > 0) {
      const adminName =
        dto.adminName && dto.adminName.trim().length > 0
          ? dto.adminName.trim()
          : `${updated.name} Admin`;

      await this.prisma.user.upsert({
        where: { phone: dto.adminPhone.trim() },
        update: {
          name: adminName,
          role: Role.ADMIN,
          hubId: updated.id,
          email: dto.adminEmail || undefined,
        },
        create: {
          phone: dto.adminPhone.trim(),
          name: adminName,
          email: dto.adminEmail || undefined,
          role: Role.ADMIN,
          hubId: updated.id,
        },
      });
    }

    return this.getHubById(updated.id);
  }

  async deleteHub(id: string, force?: boolean) {
    const existing = await this.prisma.hub.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, batches: true } } },
    });
    if (!existing) throw new NotFoundException(`Hub with ID ${id} not found`);

    if ((existing._count.orders > 0 || existing._count.batches > 0) && !force) {
      // Soft-delete/deactivate so historical records remain consistent
      const deactivated = await this.prisma.hub.update({
        where: { id },
        data: {
          isActive: false,
          adminPasswordRaw: null, // Clear raw password so deleted hub cannot be logged in
        },
      });

      // Unlink users and delivery partners from deactivated hub
      await this.prisma.user.updateMany({
        where: { hubId: id },
        data: { hubId: null },
      });
      await this.prisma.deliveryPartnerProfile.updateMany({
        where: { hubId: id },
        data: { hubId: null },
      });

      return deactivated;
    }

    // Hard-delete: Clean up relational foreign keys in a safe transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Unlink users
      await tx.user.updateMany({
        where: { hubId: id },
        data: { hubId: null },
      });

      // 2. Unlink delivery partners
      await tx.deliveryPartnerProfile.updateMany({
        where: { hubId: id },
        data: { hubId: null },
      });

      // 3. Remove settlements
      await tx.cashSettlement.deleteMany({
        where: { hubId: id },
      });

      // 4. Remove orders, items, tracking events if force-purging test hub
      const orders = await tx.order.findMany({
        where: { hubId: id },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.orderStatusEvent.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.deliveryTrip.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.paymentTransaction.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.deliveryIssueTicket.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.order.deleteMany({
          where: { id: { in: orderIds } },
        });
      }

      // 5. Delete inventory batches
      await tx.inventoryBatch.deleteMany({
        where: { hubId: id },
      });

      // 6. Delete Hub record completely from database
      return tx.hub.delete({
        where: { id },
      });
    });
  }

  async checkServiceability(lat: number, lng: number) {
    const allHubs = await this.prisma.hub.findMany();

    if (allHubs.length === 0) {
      return {
        serviceable: false,
        storeOffline: false,
        nearestDistanceKm: null,
        nearestHub: null,
        message:
          "Coming Soon! We are launching in new cities shortly. Register to be notified upon launch.",
      };
    }

    // Calculate distance to each hub (both active and inactive)
    const hubsWithDistance = allHubs.map((hub) => {
      const dist = calculateDistanceKm(lat, lng, hub.latitude, hub.longitude);
      return {
        hub,
        distanceKm: Math.round(dist * 10) / 10,
        radius: hub.deliveryRadiusKm || 10.0,
      };
    });

    // Sort closest first
    hubsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    // 1. Check if any ACTIVE hub covers this customer's location
    const activeHubsWithinRadius = hubsWithDistance.filter(
      (h) => h.hub.isActive && h.distanceKm <= h.radius
    );

    if (activeHubsWithinRadius.length > 0) {
      const servingHub = activeHubsWithinRadius[0];
      const estMinutes = Math.min(
        45,
        Math.max(15, Math.round(15 + servingHub.distanceKm * 2.2))
      );
      const deliveryFee = (servingHub.hub as any).deliveryFee ?? 0;
      const handlingFee = (servingHub.hub as any).handlingFee ?? 0;

      return {
        serviceable: true,
        storeOffline: false,
        hub: {
          id: servingHub.hub.id,
          name: servingHub.hub.name,
          code: servingHub.hub.code,
          address: servingHub.hub.address,
          city: servingHub.hub.city,
          latitude: servingHub.hub.latitude,
          longitude: servingHub.hub.longitude,
          deliveryRadiusKm: servingHub.radius,
          isActive: true,
        },
        distanceKm: servingHub.distanceKm,
        estimatedDeliveryMinutes: estMinutes,
        deliveryFee,
        handlingFee,
      };
    }

    // 2. Check if the customer is within the delivery radius of a hub that is currently OFFLINE
    const offlineHubWithinRadius = hubsWithDistance.find(
      (h) => !h.hub.isActive && h.distanceKm <= h.radius
    );

    if (offlineHubWithinRadius) {
      return {
        serviceable: false,
        storeOffline: true,
        hub: {
          id: offlineHubWithinRadius.hub.id,
          name: offlineHubWithinRadius.hub.name,
          code: offlineHubWithinRadius.hub.code,
          address: offlineHubWithinRadius.hub.address,
          city: offlineHubWithinRadius.hub.city,
          latitude: offlineHubWithinRadius.hub.latitude,
          longitude: offlineHubWithinRadius.hub.longitude,
          deliveryRadiusKm: offlineHubWithinRadius.radius,
          isActive: false,
        },
        distanceKm: offlineHubWithinRadius.distanceKm,
        message: `${offlineHubWithinRadius.hub.name} is currently offline and not accepting orders right now.`,
      };
    }

    // 3. Customer is outside the delivery radius of any hub -> Coming Soon
    const closest = hubsWithDistance[0];
    return {
      serviceable: false,
      storeOffline: false,
      nearestDistanceKm: closest.distanceKm,
      nearestHub: {
        id: closest.hub.id,
        name: closest.hub.name,
        city: closest.hub.city,
        latitude: closest.hub.latitude,
        longitude: closest.hub.longitude,
      },
      message: `Coming Soon! Your location is ${closest.distanceKm} km away from ${closest.hub.name} (our express delivery zone is currently 10 km).`,
    };
  }

  async notifyInterest(dto: NotifyInterestDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException("Either phone or email must be provided");
    }

    return this.prisma.notifyInterestLead.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        latitude: Number(dto.latitude),
        longitude: Number(dto.longitude),
        areaName: dto.areaName || "Customer Location",
        consentGiven: dto.consentGiven ?? true,
      },
    });
  }

  /**
   * Superadmin generates or sets password for Hub Admin
   */
  async setHubAdminPassword(
    hubId: string,
    passwordInput?: string,
    adminPhone?: string,
  ) {
    const hub = await this.prisma.hub.findUnique({
      where: { id: hubId },
      include: { admins: true },
    });
    if (!hub) throw new NotFoundException(`Hub with ID ${hubId} not found`);

    const rawPassword =
      passwordInput && passwordInput.trim().length > 0
        ? passwordInput.trim()
        : `Hub@${hub.code.replace(/[^A-Za-z0-9]/g, "")}2026`;

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const targetPhone =
      adminPhone?.trim() ||
      hub.admins[0]?.phone ||
      hub.contactPhone ||
      "+919999999999";

    // Update or create hub admin user with password and ensure active status
    await this.prisma.user.upsert({
      where: { phone: targetPhone },
      update: {
        password: hashedPassword,
        hubId: hub.id,
        role: Role.ADMIN,
        isActive: true,
      },
      create: {
        phone: targetPhone,
        name: `${hub.name} Admin`,
        role: Role.ADMIN,
        hubId: hub.id,
        password: hashedPassword,
        isActive: true,
      },
    });

    // Unlink any deactivated / deleted admin users from this hub so they don't pollute the hub's admin list
    await this.prisma.user.updateMany({
      where: {
        hubId: hub.id,
        OR: [
          { isActive: false },
          { name: "Deleted User" },
          { phone: { startsWith: "deleted_" } },
        ],
      },
      data: {
        hubId: null,
      },
    });

    // Update hub contactPhone and record generated password
    await this.prisma.hub.update({
      where: { id: hub.id },
      data: {
        contactPhone: targetPhone,
        adminPasswordRaw: rawPassword,
      },
    });

    return {
      success: true,
      hubId: hub.id,
      hubName: hub.name,
      hubNumber: targetPhone,
      hubCode: hub.code,
      password: rawPassword,
    };
  }
}
