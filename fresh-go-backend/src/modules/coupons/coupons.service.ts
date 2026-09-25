import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateCouponDto, ValidateCouponDto } from "./dto/coupon.dto";
import { DiscountType } from "@prisma/client";

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(activeOnly = true) {
    return this.prisma.coupon.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { startDate: "desc" },
    });
  }

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) throw new BadRequestException("Coupon code already exists");

    return this.prisma.coupon.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async validateCoupon(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException("Invalid or inactive coupon code");
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new BadRequestException("Coupon code has expired");
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException("Coupon usage limit reached");
    }

    if (subtotal < coupon.minOrderValue) {
      throw new BadRequestException(
        `Order subtotal must be at least ₹${coupon.minOrderValue} to apply this coupon`,
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.FLAT_AMOUNT) {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    } else if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountAmount,
      finalSubtotal: Math.max(0, subtotal - discountAmount),
    };
  }

  async delete(id: string) {
    return this.prisma.coupon.delete({ where: { id } });
  }
}
