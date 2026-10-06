import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import {
  SendOtpDto,
  VerifyOtpDto,
  FirebaseLoginDto,
  SuperAdminLoginDto,
  HubAdminLoginDto,
  DeliveryLoginDto,
  DeliveryRegisterDto,
} from "./dto/auth.dto";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { User } from "@prisma/client";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post("super-admin/login")
  @HttpCode(HttpStatus.OK)
  async superAdminLogin(@Body() dto: SuperAdminLoginDto) {
    return this.authService.loginSuperAdmin(dto);
  }

  @Public()
  @Post("hub-admin/login")
  @HttpCode(HttpStatus.OK)
  async hubAdminLogin(@Body() dto: HubAdminLoginDto) {
    return this.authService.loginHubAdmin(dto);
  }

  @Public()
  @Post("delivery/login")
  @HttpCode(HttpStatus.OK)
  async deliveryLogin(@Body() dto: DeliveryLoginDto) {
    return this.authService.loginDeliveryPartner(dto);
  }

  @Public()
  @Post("delivery/register")
  @HttpCode(HttpStatus.OK)
  async deliveryRegister(@Body() dto: DeliveryRegisterDto) {
    return this.authService.registerDeliveryPartner(dto);
  }

  @Public()
  @Throttle({
    short: { limit: 1, ttl: 1000 },
    long: { limit: 5, ttl: 60000 },
  })
  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    long: { limit: 8, ttl: 60000 },
  })
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    long: { limit: 8, ttl: 60000 },
  })
  @Post("firebase-login")
  @HttpCode(HttpStatus.OK)
  async firebaseLogin(@Body() dto: FirebaseLoginDto) {
    return this.authService.firebaseLogin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getProfile(@CurrentUser() user: User) {
    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
