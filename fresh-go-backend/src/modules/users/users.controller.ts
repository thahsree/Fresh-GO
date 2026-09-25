import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateAddressDto, UpdatePartnerProfileDto } from "./dto/users.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User, Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("addresses")
  async getAddresses(@CurrentUser() user: User) {
    return this.usersService.getAddresses(user.id);
  }

  @Post("addresses")
  async addAddress(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(user.id, dto);
  }

  @Delete("addresses/:id")
  async deleteAddress(@CurrentUser() user: User, @Param("id") id: string) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Roles(Role.DELIVERY_PARTNER)
  @Put("partner/profile")
  async updatePartnerProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdatePartnerProfileDto,
  ) {
    return this.usersService.updatePartnerProfile(user.id, dto);
  }

  @Post("push-token")
  async updatePushToken(
    @CurrentUser() user: User,
    @Body("pushToken") pushToken: string,
  ) {
    return this.usersService.updatePushToken(user.id, pushToken);
  }
}
