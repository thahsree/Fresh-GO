import { IsNotEmpty, IsString, IsNumber, IsOptional } from "class-validator";

export class CreatePaymentOrderDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;
}

export class VerifyPaymentDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  razorpayOrderId: string;

  @IsNotEmpty()
  @IsString()
  razorpayPaymentId: string;

  @IsNotEmpty()
  @IsString()
  razorpaySignature: string;
}
