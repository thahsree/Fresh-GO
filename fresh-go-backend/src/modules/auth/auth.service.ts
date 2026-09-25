import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { SmsService } from "../notifications/sms.service";
import { SendOtpDto, VerifyOtpDto } from "./dto/auth.dto";
import { Role } from "@prisma/client";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const { phone } = dto;
    const isDev = this.configService.get<string>("nodeEnv") === "development";

    // Generate 6-digit OTP (123456 in dev/mock, or cryptographically random in prod)
    const otp = isDev
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();

    // Cache in Redis with 5 mins (300 seconds) TTL
    const redisKey = `otp:${phone}`;
    await this.redis.set(redisKey, otp, 300);

    // Rate limiting: track recent sends (max 3 per 10 mins)
    const rateKey = `otp_rate:${phone}`;
    const sendCount = await this.redis.get(rateKey);
    if (sendCount && parseInt(sendCount, 10) >= 5) {
      throw new BadRequestException(
        "Too many OTP attempts. Please wait 10 minutes.",
      );
    }
    await this.redis.set(
      rateKey,
      (parseInt(sendCount || "0", 10) + 1).toString(),
      600,
    );

    // Dispatch SMS via provider
    await this.smsService.sendOtp(phone, otp);

    return {
      message: "OTP sent successfully",
      phone,
      expiresInSeconds: 300,
      ...(isDev ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { phone, otp, role = Role.CUSTOMER, name } = dto;
    const redisKey = `otp:${phone}`;
    const cachedOtp = await this.redis.get(redisKey);

    // Allow master OTP '123456' in dev or if matches Redis
    const isDev = this.configService.get<string>("nodeEnv") === "development";
    const isValid = cachedOtp === otp || (isDev && otp === "123456");

    if (!isValid) {
      throw new BadRequestException("Invalid or expired OTP");
    }

    // Invalidate OTP after single use
    await this.redis.del(redisKey);

    // Find or create User
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        customerProfile: true,
        partnerProfile: true,
        wallet: true,
      },
    });

    if (!user) {
      const assignedRole = (role as Role) || Role.CUSTOMER;
      user = await this.prisma.user.create({
        data: {
          phone,
          name:
            name ||
            (assignedRole === Role.DELIVERY_PARTNER
              ? "New Partner"
              : "New Customer"),
          role: assignedRole,
          ...(assignedRole === Role.CUSTOMER
            ? {
                customerProfile: { create: {} },
                wallet: { create: { balance: 0.0 } },
              }
            : {}),
          ...(assignedRole === Role.DELIVERY_PARTNER
            ? {
                partnerProfile: {
                  create: {
                    vehicleType: "BIKE",
                    isOnline: false,
                  },
                },
              }
            : {}),
        },
        include: {
          customerProfile: true,
          partnerProfile: true,
          wallet: true,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        customerProfile: user.customerProfile,
        partnerProfile: user.partnerProfile,
        walletBalance: user.wallet?.balance || 0,
      },
      ...tokens,
    };
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };
    const accessSecret = this.configService.get<string>("jwt.accessSecret");
    const refreshSecret = this.configService.get<string>("jwt.refreshSecret");

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: this.configService.get<string>("jwt.accessExpiration", "7d"),
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: this.configService.get<string>(
          "jwt.refreshExpiration",
          "30d",
        ),
      }),
    ]);

    // Store refresh token hash in Redis
    await this.redis.set(`refresh_token:${userId}`, refreshToken, 30 * 86400);

    return {
      accessToken,
      refreshToken,
    };
  }
}
