import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { HubsService } from "./hubs.service";
import {
  CreateHubDto,
  UpdateHubDto,
  CheckServiceabilityDto,
  NotifyInterestDto,
} from "./dto/hubs.dto";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Role } from "@prisma/client";

@Controller("hubs")
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  @Public()
  @Get()
  async getHubs(@Query("all") all?: string) {
    return this.hubsService.getHubs({
      includeInactive: all === "true",
    });
  }

  @Public()
  @Get("serviceability")
  async checkServiceability(@Query() query: CheckServiceabilityDto) {
    return this.hubsService.checkServiceability(
      Number(query.lat),
      Number(query.lng)
    );
  }

  @Public()
  @Post("notify-interest")
  async notifyInterest(@Body() dto: NotifyInterestDto) {
    return this.hubsService.notifyInterest(dto);
  }

  @Public()
  @Get(":id")
  async getHubById(@Param("id") id: string) {
    return this.hubsService.getHubById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  async createHub(@Body() dto: CreateHubDto) {
    return this.hubsService.createHub(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Put(":id")
  async updateHub(@Param("id") id: string, @Body() dto: UpdateHubDto) {
    return this.hubsService.updateHub(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post(":id/admin-password")
  async setAdminPassword(
    @Param("id") hubId: string,
    @Body("password") password?: string,
    @Body("adminPhone") adminPhone?: string,
  ) {
    return this.hubsService.setHubAdminPassword(hubId, password, adminPhone);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete(":id")
  async deleteHub(@Param("id") id: string) {
    return this.hubsService.deleteHub(id);
  }
}
