import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { InventoryModule } from "../inventory/inventory.module";
import { ZonesModule } from "../zones/zones.module";
import { CouponsModule } from "../coupons/coupons.module";
import { CartModule } from "../cart/cart.module";

@Module({
  imports: [InventoryModule, ZonesModule, CouponsModule, CartModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
