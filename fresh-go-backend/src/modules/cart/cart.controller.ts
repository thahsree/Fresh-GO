import { Controller, Get, Post, Delete, Body, UseGuards } from "@nestjs/common";
import { CartService } from "./cart.service";
import { UpdateCartItemDto } from "./dto/cart.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";

@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user.id);
  }

  @Post("items")
  async updateItem(@CurrentUser() user: User, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(user.id, dto);
  }

  @Delete()
  async clearCart(@CurrentUser() user: User) {
    return this.cartService.clearCart(user.id);
  }
}
