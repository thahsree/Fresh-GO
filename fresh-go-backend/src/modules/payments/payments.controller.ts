import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreatePaymentOrderDto, VerifyPaymentDto } from "./dto/payment.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "@prisma/client";
import { Request } from "express";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("create-order")
  async createOnlineOrder(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    if (process.env.ONLINE_PAYMENTS_ENABLED !== "true") {
      throw new BadRequestException(
        "Online payments are currently disabled for this phase. All orders are processed via Cash on Delivery (COD).",
      );
    }
    return this.paymentsService.createOnlinePaymentOrder(dto.orderId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("verify")
  async verifyPayment(
    @CurrentUser() user: User,
    @Body() dto: VerifyPaymentDto,
  ) {
    if (process.env.ONLINE_PAYMENTS_ENABLED !== "true") {
      throw new BadRequestException(
        "Online payments are currently disabled. All orders are processed via Cash on Delivery (COD).",
      );
    }
    return this.paymentsService.verifyPayment(dto, user.id);
  }

  @Public()
  @Post("webhook")
  async webhook(
    @Req() req: Request,
    @Headers("x-razorpay-signature") signature: string,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    return this.paymentsService.handleRazorpayWebhook(
      rawBody,
      signature,
      idempotencyKey,
    );
  }
}
