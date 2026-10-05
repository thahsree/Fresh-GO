import { IsNotEmpty, IsString, Matches, IsOptional } from "class-validator";

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
  role?: "CUSTOMER" | "DELIVERY_PARTNER" | "ADMIN" | "SUPER_ADMIN";
  name?: string;
}

export class SuperAdminLoginDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class HubAdminLoginDto {
  @IsNotEmpty()
  @IsString()
  hubIdentifier: string; // Hub Phone / Contact Number or Hub Code

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class DeliveryLoginDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  partnerId: string; // 6-digit Unique Partner ID issued by Hub Admin
}

export class DeliveryRegisterDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  hubId: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licensePhoto?: string;
}
