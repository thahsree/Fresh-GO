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
import { ZonesService } from "./zones.service";
import { CreateZoneDto, CheckLocationDto } from "./dto/zone.dto";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Role } from "@prisma/client";

@Controller("zones")
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Public()
  @Get()
  async getAll(@Query("all") all?: string) {
    return this.zonesService.findAll(all !== "true");
  }

  @Public()
  @Post("check-serviceability")
  async checkLocation(@Body() dto: CheckLocationDto) {
    return this.zonesService.findZoneForCoordinates(
      dto.latitude,
      dto.longitude,
    );
  }

  @Public()
  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.zonesService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: Partial<CreateZoneDto>) {
    return this.zonesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.zonesService.delete(id);
  }
}
