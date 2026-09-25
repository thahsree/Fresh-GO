import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";

export class UpdateCartItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  cutOptionId?: string;
}
