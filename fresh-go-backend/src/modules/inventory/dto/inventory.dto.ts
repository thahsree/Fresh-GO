import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
} from "class-validator";

export class CreateBatchIntakeDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  hubId?: string;

  @IsNotEmpty()
  @IsDateString()
  catchOrHarvestDate: string;

  @IsNotEmpty()
  @IsString()
  originSource: string;

  @IsNotEmpty()
  @IsNumber()
  initialQuantityKg: number;

  @IsOptional()
  @IsNumber()
  temperatureAtIntake?: number;

  @IsNotEmpty()
  @IsDateString()
  expiryDate: string;
}
