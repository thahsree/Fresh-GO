import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { DispatchService } from "./dispatch.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER, Role.HUB_MANAGER)
@Controller("dispatch")
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get("tower")
  async getTower() {
    return this.dispatchService.getDispatchTower();
  }

  @Post("orders/:orderId/assign")
  async assignOrder(
    @Param("orderId") orderId: string,
    @Body("partnerProfileId") partnerProfileId?: string,
  ) {
    return this.dispatchService.dispatchOrderToPartner(
      orderId,
      partnerProfileId,
    );
  }
}
