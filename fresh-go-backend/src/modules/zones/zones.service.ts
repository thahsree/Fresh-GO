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

  /**
   * Identifies which delivery zone services the given GPS coordinates.
   * Calculates actual distance from center, estimated ETA, and applicable delivery fee.
   */
  async findZoneForCoordinates(latitude: number, longitude: number) {
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
          baseDeliveryFee: zone.baseDeliveryFee,
          minOrderAmount: zone.minOrderAmount,
          freeDeliveryThreshold: zone.freeDeliveryThreshold,
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
