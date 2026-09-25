import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";
import { DeliveryPhase, IssueCategory, IssuePriority } from "@prisma/client";

export class UpdateTripPhaseDto {
  @IsNotEmpty()
  @IsEnum(DeliveryPhase)
  phase: DeliveryPhase;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;
}

export class RecordCashSettlementDto {
  @IsNotEmpty()
  @IsString()
  partnerProfileId: string;

  @IsNotEmpty()
  @IsString()
  hubId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsNotEmpty()
  @IsString()
  receiptNumber: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateIssueTicketDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsNotEmpty()
  @IsEnum(IssueCategory)
  category: IssueCategory;

  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @IsNotEmpty()
  @IsString()
  description: string;
}
