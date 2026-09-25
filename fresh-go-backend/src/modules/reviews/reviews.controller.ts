import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/review.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "@prisma/client";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get("product/:productId")
  async getProductReviews(@Param("productId") productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createReview(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user.id, dto);
  }
}
