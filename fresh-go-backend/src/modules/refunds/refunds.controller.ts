import { Controller, Post, Param, Body, UseGuards } from "@nestjs/common";
import { RefundsService } from "./refunds.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User, Role } from "@prisma/client";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("refunds")
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post("orders/:orderId/cancel")
  async cancelAndRefund(
    @CurrentUser() user: User,
    @Param("orderId") orderId: string,
    @Body("reason") reason: string,
  ) {
    return this.refundsService.processOrderCancellationRefund(
      orderId,
      reason || "Customer cancellation",
      user.id,
    );
  }
}
