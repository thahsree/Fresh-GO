import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import {
  UpdateTripPhaseDto,
  RecordCashSettlementDto,
  CreateIssueTicketDto,
} from "./dto/delivery.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User, Role } from "@prisma/client";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Roles(Role.DELIVERY_PARTNER)
  @Get("dashboard")
  async getDashboard(@CurrentUser() user: User) {
    return this.deliveryService.getPartnerDashboard(user.id);
  }

  @Roles(Role.DELIVERY_PARTNER)
  @Post("orders/:orderId/accept")
  async acceptOrder(
    @CurrentUser() user: User,
    @Param("orderId") orderId: string,
  ) {
    return this.deliveryService.acceptDeliveryOrder(user.id, orderId);
  }

  @Roles(Role.DELIVERY_PARTNER)
  @Put("trips/:tripId/phase")
  async updateTripPhase(
    @CurrentUser() user: User,
    @Param("tripId") tripId: string,
    @Body() dto: UpdateTripPhaseDto,
  ) {
    return this.deliveryService.updateTripPhase(user.id, tripId, dto);
  }

  @Roles(Role.DELIVERY_PARTNER)
  @Post("issues")
  async reportIssue(
    @CurrentUser() user: User,
    @Body() dto: CreateIssueTicketDto,
  ) {
    return this.deliveryService.reportIssue(user.id, dto);
  }

  @Roles(Role.ADMIN, Role.HUB_MANAGER)
  @Post("settlements")
  async recordSettlement(
    @CurrentUser() user: User,
    @Body() dto: RecordCashSettlementDto,
  ) {
    return this.deliveryService.recordCashSettlement(dto, user.id);
  }
}
