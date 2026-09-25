import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";

// Infrastructure Modules
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { StorageModule } from "./modules/storage/storage.module";
import { MapsModule } from "./modules/maps/maps.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { TrackingModule } from "./modules/tracking/tracking.module";
import { PricingModule } from "./modules/pricing/pricing.module";

// Domain Modules
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { CartModule } from "./modules/cart/cart.module";
import { ZonesModule } from "./modules/zones/zones.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { DispatchModule } from "./modules/dispatch/dispatch.module";
import { RefundsModule } from "./modules/refunds/refunds.module";

import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,
        limit: 20, // 20 req/s burst limit
      },
      {
        name: "medium",
        ttl: 10000,
        limit: 80, // 80 req/10s
      },
      {
        name: "long",
        ttl: 60000,
        limit: 300, // 300 req/min
      },
    ]),
    PrismaModule,
    RedisModule,
    NotificationsModule,
    StorageModule,
    MapsModule,
    JobsModule,
    TrackingModule,
    PricingModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    ZonesModule,
    CouponsModule,
    ReviewsModule,
    WalletModule,
    PaymentsModule,
    OrdersModule,
    DeliveryModule,
    DispatchModule,
    RefundsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
