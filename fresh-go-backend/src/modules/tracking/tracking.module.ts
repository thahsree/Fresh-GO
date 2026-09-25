import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingService } from "./tracking.service";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          "jwt.accessSecret",
          "freshgo_super_secret_jwt_access_key_2026",
        ),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingService, TrackingGateway],
})
export class TrackingModule {}
