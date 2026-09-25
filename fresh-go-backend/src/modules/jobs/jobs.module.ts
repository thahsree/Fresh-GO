import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JobsService } from "./jobs.service";
import {
  DispatchProcessor,
  OrderTimeoutProcessor,
  BatchExpiryProcessor,
} from "./jobs.processor";
import {
  QUEUE_DISPATCH,
  QUEUE_ORDER_TIMEOUT,
  QUEUE_BATCH_EXPIRY,
} from "./jobs.constants";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        let redisUrl = configService.get<string>("REDIS_URL");
        if (redisUrl && redisUrl.trim().length > 0) {
          if (redisUrl.includes("redis-cli")) {
            const match = redisUrl.match(/redis[s]?:\/\/[^\s"']+/);
            if (match) redisUrl = match[0];
          }
          if (
            redisUrl.includes("upstash.io") &&
            redisUrl.startsWith("redis://")
          ) {
            redisUrl = redisUrl.replace("redis://", "rediss://");
          }
          try {
            const parsed = new URL(redisUrl);
            const isTls =
              parsed.protocol === "rediss:" || redisUrl.includes("upstash.io");
            return {
              connection: {
                host: parsed.hostname,
                port: Number(parsed.port) || 6379,
                username: parsed.username
                  ? decodeURIComponent(parsed.username)
                  : undefined,
                password: parsed.password
                  ? decodeURIComponent(parsed.password)
                  : undefined,
                tls: isTls ? {} : undefined,
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
              },
            };
          } catch {
            // fallback if URL parse error
          }
        }

        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        const password =
          configService.get<string>("REDIS_PASSWORD") || undefined;
        const rawTls = configService.get<string | boolean>("REDIS_TLS", false);
        const useTls =
          rawTls === true || rawTls === "true" || host.includes("upstash.io");

        return {
          connection: {
            host,
            port,
            password,
            tls: useTls ? {} : undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_DISPATCH },
      { name: QUEUE_ORDER_TIMEOUT },
      { name: QUEUE_BATCH_EXPIRY },
    ),
  ],
  providers: [
    JobsService,
    DispatchProcessor,
    OrderTimeoutProcessor,
    BatchExpiryProcessor,
  ],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
