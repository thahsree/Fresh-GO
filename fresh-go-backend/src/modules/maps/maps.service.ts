import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Calculates distance between two coordinates in kilometers using Haversine formula
   */
  calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
  }

  /**
   * Estimates trip duration in minutes given distance in kilometers
   */
  estimateDurationMinutes(distanceKm: number): number {
    // Approx 25 km/h average city scooter speed + 5 mins buffer
    const travelTime = (distanceKm / 25) * 60;
    return Math.max(10, Math.round(travelTime + 5));
  }

  /**
   * Checks whether a customer's coordinates fall within a delivery zone radius
   */
  isPointInZone(
    userLat: number,
    userLng: number,
    zoneCenterLat: number,
    zoneCenterLng: number,
    radiusKm: number,
  ): boolean {
    const dist = this.calculateDistanceKm(
      userLat,
      userLng,
      zoneCenterLat,
      zoneCenterLng,
    );
    return dist <= radiusKm;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
