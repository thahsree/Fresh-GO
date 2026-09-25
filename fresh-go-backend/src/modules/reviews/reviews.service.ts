import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateReviewDto } from "./dto/review.dto";
import { OrderStatus, ReviewStatus } from "@prisma/client";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order || order.customerId !== userId) {
      throw new BadRequestException(
        "Order not found or does not belong to you",
      );
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        "Can only review products from delivered orders",
      );
    }

    const itemExists = order.items.some((it) => it.productId === dto.productId);
    if (!itemExists) {
      throw new BadRequestException("This product was not in your order");
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        orderId: dto.orderId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedBuyer: true,
        status: ReviewStatus.APPROVED,
      },
    });

    // Recalculate product rating
    const aggregates = await this.prisma.review.aggregate({
      where: { productId: dto.productId, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.product.update({
      where: { id: dto.productId },
      data: {
        rating: Math.round((aggregates._avg.rating || 5.0) * 10) / 10,
        reviewsCount: aggregates._count.id,
      },
    });

    return review;
  }

  async getProductReviews(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, status: ReviewStatus.APPROVED },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
}
