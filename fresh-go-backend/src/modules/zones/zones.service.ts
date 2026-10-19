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
    const zones = await this.findAll(true);
    const primaryZone = zones[0] || null;
    return {
      deliveryFee: primaryZone?.baseDeliveryFee ?? 0,
      freeDeliveryThreshold: primaryZone?.freeDeliveryThreshold ?? 0,
      minOrderAmount: primaryZone?.minOrderAmount ?? 0,
      handlingFee: 0,
      isFreeDelivery: (primaryZone?.baseDeliveryFee ?? 0) === 0,
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
    const freeThreshold =
      dto.freeDeliveryThreshold !== undefined
        ? Math.max(0, Number(dto.freeDeliveryThreshold))
        : undefined;
    const minOrder =
      dto.minOrderAmount !== undefined
        ? Math.max(0, Number(dto.minOrderAmount))
        : undefined;

    if (dto.zoneId) {
      await this.prisma.deliveryZone.update({
        where: { id: dto.zoneId },
        data: {
          baseDeliveryFee: fee,
          ...(freeThreshold !== undefined ? { freeDeliveryThreshold: freeThreshold } : {}),
          ...(minOrder !== undefined ? { minOrderAmount: minOrder } : {}),
        },
      });
    } else {
      await this.prisma.deliveryZone.updateMany({
        data: {
          baseDeliveryFee: fee,
          ...(freeThreshold !== undefined ? { freeDeliveryThreshold: freeThreshold } : {}),
          ...(minOrder !== undefined ? { minOrderAmount: minOrder } : {}),
        },
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

        // Find if an active DeliveryZone covers this location
        const activeZones = await this.findAll(true);
        const matchingZone = activeZones.find((z) =>
          this.mapsService.isPointInZone(
            latitude,
            longitude,
            z.centerLat,
            z.centerLng,
            z.radiusKm,
          ),
        );

        const fee = matchingZone?.baseDeliveryFee ?? (activeZones[0]?.baseDeliveryFee ?? 0);
        const minOrder = matchingZone?.minOrderAmount ?? (activeZones[0]?.minOrderAmount ?? 0);
        const freeThreshold = matchingZone?.freeDeliveryThreshold ?? (activeZones[0]?.freeDeliveryThreshold ?? 0);

        return {
          serviceable: true,
          hub,
          zone: matchingZone || {
            id: null,
            name: hub.name,
            centerLat: hub.latitude,
            centerLng: hub.longitude,
            radiusKm,
            polygonGeoJson: null,
            baseDeliveryFee: fee,
            minOrderAmount: minOrder,
            freeDeliveryThreshold: freeThreshold,
            estimatedDeliveryMinutes: 15,
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

    // 2. Check legacy delivery zones table
    const activeZones = await this.findAll(true);

    for (const zone of activeZones) {
      const isInside = this.mapsService.isPointInZone(
        latitude,
        longitude,
        zone.centerLat,
        zone.centerLng,
        zone.radiusKm,
      );

      if (isInside) {
        const distanceKm = this.mapsService.calculateDistanceKm(
          latitude,
          longitude,
          zone.centerLat,
          zone.centerLng,
        );
        const etaMinutes = this.mapsService.estimateDurationMinutes(distanceKm);

        return {
          serviceable: true,
          zone,
          distanceKm,
          etaMinutes: Math.max(zone.estimatedDeliveryMinutes, etaMinutes),
          baseDeliveryFee: zone.baseDeliveryFee ?? 0,
          minOrderAmount: zone.minOrderAmount ?? 0,
          freeDeliveryThreshold: zone.freeDeliveryThreshold ?? 0,
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
