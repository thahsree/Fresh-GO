import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log("✅ Database connected successfully via Prisma");
        return;
      } catch (err: any) {
        retries--;
        this.logger.warn(`Database connection attempt failed: ${err.message}. Retries left: ${retries}`);
        if (retries === 0) {
          this.logger.error("⚠️ Initial database connection timed out. Server started, Prisma will connect lazily on query.");
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
