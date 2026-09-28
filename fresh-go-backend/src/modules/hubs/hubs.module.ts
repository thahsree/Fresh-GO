import { Module } from "@nestjs/common";
import { HubsService } from "./hubs.service";
import { HubsController } from "./hubs.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [HubsController],
  providers: [HubsService],
  exports: [HubsService],
})
export class HubsModule {}
