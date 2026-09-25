import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { CreateBatchIntakeDto } from "./dto/inventory.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles(Role.ADMIN, Role.HUB_MANAGER)
  @Get("batches")
  async getBatches(@Query("productId") productId?: string) {
    return this.inventoryService.getBatches(productId);
  }

  @Roles(Role.ADMIN, Role.HUB_MANAGER)
  @Post("batches/intake")
  async intakeBatch(@Body() dto: CreateBatchIntakeDto) {
    return this.inventoryService.createBatch(dto);
  }
}
