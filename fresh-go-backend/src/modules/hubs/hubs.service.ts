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
        city: dto.city || "Kozhikode",
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

  async deleteHub(id: string) {
    const existing = await this.prisma.hub.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, batches: true } } },
    });
    if (!existing) throw new NotFoundException(`Hub with ID ${id} not found`);

    if (existing._count.orders > 0 || existing._count.batches > 0) {
      // Soft-delete/deactivate so historical records remain consistent
      return this.prisma.hub.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.hub.delete({ where: { id } });
  }

  async checkServiceability(lat: number, lng: number) {
    const hubs = await this.prisma.hub.findMany({
      where: { isActive: true },
    });

    if (hubs.length === 0) {
      return {
        serviceable: false,
        nearestDistanceKm: null,
        nearestHub: null,
        message:
          "Coming Soon! We are launching in new cities shortly. Register to be notified upon launch.",
      };
    }

    // Calculate distance to each active hub
    const hubsWithDistance = hubs.map((hub) => {
      const dist = calculateDistanceKm(lat, lng, hub.latitude, hub.longitude);
      return {
        hub,
        distanceKm: Math.round(dist * 10) / 10,
        radius: hub.deliveryRadiusKm || 10.0,
      };
    });

    // Sort closest first
    hubsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    const closest = hubsWithDistance[0];

    // Only customers surrounded by 10km (or hub radius) are serviceable
    const isServiceable = closest.distanceKm <= closest.radius;

    if (isServiceable) {
      const estMinutes = Math.min(
        45,
        Math.max(15, Math.round(15 + closest.distanceKm * 2.2))
      );
      const deliveryFee = closest.distanceKm > 5 ? 40 : 25;

      return {
        serviceable: true,
        hub: {
          id: closest.hub.id,
          name: closest.hub.name,
          code: closest.hub.code,
          address: closest.hub.address,
          city: closest.hub.city,
          latitude: closest.hub.latitude,
          longitude: closest.hub.longitude,
          deliveryRadiusKm: closest.radius,
        },
        distanceKm: closest.distanceKm,
        estimatedDeliveryMinutes: estMinutes,
        deliveryFee,
      };
    }

    return {
      serviceable: false,
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

    // Update or create hub admin user with password
    await this.prisma.user.upsert({
      where: { phone: targetPhone },
      update: {
        password: hashedPassword,
        hubId: hub.id,
        role: Role.ADMIN,
      },
      create: {
        phone: targetPhone,
        name: `${hub.name} Admin`,
        role: Role.ADMIN,
        hubId: hub.id,
        password: hashedPassword,
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
