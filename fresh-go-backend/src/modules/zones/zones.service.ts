import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MapsService } from "../maps/maps.service";
import { CreateZoneDto } from "./dto/zone.dto";

@Injectable()
export class ZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapsService: MapsService,
  ) {}

  async findAll(activeOnly = true) {
    return this.prisma.deliveryZone.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException("Delivery zone not found");
    return zone;
  }

  async create(dto: CreateZoneDto) {
    return this.prisma.deliveryZone.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateZoneDto>) {
    await this.findById(id);
    return this.prisma.deliveryZone.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.deliveryZone.delete({ where: { id } });
  }


  async getDeliveryFeeSettings() {
    // Derive fee settings dynamically from active hubs — no legacy seed zone needed
    const activeHubs = await this.prisma.hub.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Map each hub into a zone-shaped object for the admin UI
    const zones = activeHubs.map((hub) => ({
      id: hub.id,
      name: hub.name,
      radiusKm: hub.deliveryRadiusKm ?? 10.0,
      baseDeliveryFee: (hub as any).deliveryFee ?? 0,
      freeDeliveryThreshold: (hub as any).freeDeliveryThreshold ?? 0,
      minOrderAmount: (hub as any).minOrderAmount ?? 0,
      handlingFee: (hub as any).handlingFee ?? 0,
      isActive: hub.isActive,
    }));

    // Global defaults = first active hub's settings (or zeros if no hubs yet)
    const primary = zones[0] ?? null;
    return {
      deliveryFee: primary?.baseDeliveryFee ?? 0,
      freeDeliveryThreshold: primary?.freeDeliveryThreshold ?? 0,
      minOrderAmount: primary?.minOrderAmount ?? 0,
      handlingFee: primary?.handlingFee ?? 0,
      isFreeDelivery: (primary?.baseDeliveryFee ?? 0) === 0,
      zones,
    };
  }

  async updateDeliveryFeeSettings(dto: {
    deliveryFee: number;
    freeDeliveryThreshold?: number;
    minOrderAmount?: number;
    handlingFee?: number;
    zoneId?: string;
  }) {
    const fee = Math.max(0, Number(dto.deliveryFee ?? 0));
    const handling =
      dto.handlingFee !== undefined
        ? Math.max(0, Number(dto.handlingFee))
        : undefined;
    const freeThreshold =
      dto.freeDeliveryThreshold !== undefined
        ? Math.max(0, Number(dto.freeDeliveryThreshold))
        : undefined;
    const minOrder =
      dto.minOrderAmount !== undefined
        ? Math.max(0, Number(dto.minOrderAmount))
        : undefined;

    const updateData: any = { deliveryFee: fee };
    if (handling !== undefined) updateData.handlingFee = handling;
    if (freeThreshold !== undefined) updateData.freeDeliveryThreshold = freeThreshold;
    if (minOrder !== undefined) updateData.minOrderAmount = minOrder;

    if (dto.zoneId) {
      // Update a specific hub by its id
      await this.prisma.hub.update({
        where: { id: dto.zoneId },
        data: updateData,
      });
    } else {
      // Update ALL active hubs globally
      await this.prisma.hub.updateMany({
        where: { isActive: true },
        data: updateData,
      });
    }

    return this.getDeliveryFeeSettings();
  }


  /**
   * Identifies which delivery zone services the given GPS coordinates.
   * Calculates actual distance from center, estimated ETA, and applicable delivery fee.
   */
  async findZoneForCoordinates(latitude: number, longitude: number) {
    // 1. Check real multi-hubs first
    const activeHubs = await this.prisma.hub.findMany({
      where: { isActive: true },
    });

    for (const hub of activeHubs) {
      const radiusKm = hub.deliveryRadiusKm || 10.0;
      const isInside = this.mapsService.isPointInZone(
        latitude,
        longitude,
        hub.latitude,
        hub.longitude,
        radiusKm,
      );

      if (isInside) {
        const distanceKm = this.mapsService.calculateDistanceKm(
          latitude,
          longitude,
          hub.latitude,
          hub.longitude,
        );
        const etaMinutes = this.mapsService.estimateDurationMinutes(distanceKm);

        const fee = (hub as any).deliveryFee ?? 0;
        const minOrder = (hub as any).minOrderAmount ?? 0;
        const freeThreshold = (hub as any).freeDeliveryThreshold ?? 0;

        return {
          serviceable: true,
          hub,
          zone: {
            id: hub.id,
            name: `${hub.name} Zone`,
            centerLat: hub.latitude,
            centerLng: hub.longitude,
            radiusKm,
            polygonGeoJson: null,
            baseDeliveryFee: fee,
            minOrderAmount: minOrder,
            freeDeliveryThreshold: freeThreshold,
            estimatedDeliveryMinutes: Math.max(15, etaMinutes),
            isActive: true,
          },
          distanceKm,
          etaMinutes: Math.max(15, etaMinutes),
          baseDeliveryFee: fee,
          minOrderAmount: minOrder,
          freeDeliveryThreshold: freeThreshold,
        };
      }
    }

    return {
      serviceable: false,
      message:
        "We currently do not deliver to this location yet. We are expanding rapidly!",
    };
  }
}
