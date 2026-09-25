import { IsNotEmpty, IsString, Matches } from "class-validator";

export class SendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, {
    message: "Phone number must be valid with country code, e.g. +919876543210",
  })
  phone: string;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: "OTP must be 4 to 6 digits" })
  otp: string;

  // Optional: User role when signing up or logging in from specific app
  role?: "CUSTOMER" | "DELIVERY_PARTNER" | "ADMIN";
  name?: string;
}
