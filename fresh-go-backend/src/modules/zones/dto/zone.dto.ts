import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
} from "class-validator";

export class CreateZoneDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  centerLat: number;

  @IsNotEmpty()
  @IsNumber()
  centerLng: number;

  @IsNotEmpty()
  @IsNumber()
  radiusKm: number;

  @IsOptional()
  @IsString()
  polygonGeoJson?: string;

  @IsOptional()
  @IsNumber()
  baseDeliveryFee?: number;

  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  freeDeliveryThreshold?: number;

  @IsOptional()
  @IsNumber()
  estimatedDeliveryMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CheckLocationDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}
