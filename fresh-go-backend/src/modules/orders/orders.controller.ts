import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { OrdersService } from "./orders.service";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";
import { User, Role } from "@prisma/client";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get("my")
  async getMyOrders(@CurrentUser() user: User) {
    return this.ordersService.getCustomerOrders(user.id);
  }

  @Get(":id")
  async getOrder(@CurrentUser() user: User, @Param("id") id: string) {
    return this.ordersService.getOrderById(id, user);
  }

  @Throttle({
    short: { limit: 2, ttl: 1000 },
    long: { limit: 10, ttl: 60000 },
  })
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async createOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.ordersService.createOrder(user.id, dto, idempotencyKey);
  }

  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HUB_MANAGER, Role.DELIVERY_PARTNER)
  @Put(":id/status")
  async updateStatus(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto, user);
  }
}
