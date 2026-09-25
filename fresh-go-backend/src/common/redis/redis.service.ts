import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    let redisUrl = this.configService.get<string>("REDIS_URL");

    if (redisUrl && redisUrl.trim().length > 0) {
      if (redisUrl.includes("redis-cli")) {
        const match = redisUrl.match(/redis[s]?:\/\/[^\s"']+/);
        if (match) redisUrl = match[0];
      }
      if (redisUrl.includes("upstash.io") && redisUrl.startsWith("redis://")) {
        redisUrl = redisUrl.replace("redis://", "rediss://");
      }

      this.logger.log("Initializing Redis client via REDIS_URL");
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    } else {
      const host = this.configService.get<string>("REDIS_HOST", "localhost");
      const port = this.configService.get<number>("REDIS_PORT", 6379);
      const password = this.configService.get<string>("REDIS_PASSWORD", "");
      const useTls =
        this.configService.get<boolean>("REDIS_TLS", false) ||
        host.includes("upstash.io");

      this.logger.log(
        `Initializing Redis client at ${host}:${port} (TLS: ${useTls})`,
      );
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        tls: useTls ? {} : undefined,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    }

    this.client.on("connect", () => {
      this.logger.log("✅ Redis client connected successfully");
    });

    this.client.connect().catch((err) => {
      this.logger.warn(
        `Redis connection warning (running in degraded offline cache mode): ${err.message}`,
      );
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(
        `Error getting key ${key} from Redis: ${error.message}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, "EX", ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key} in Redis: ${error.message}`);
    }
  }

  async setnx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch (error) {
      this.logger.error(`Error setnx for key ${key}: ${error.message}`);
      return false;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(
        `Error deleting key ${key} from Redis: ${error.message}`,
      );
    }
  }

  async acquireLock(resource: string, ttlSeconds = 10): Promise<boolean> {
    return this.setnx(`lock:${resource}`, "1", ttlSeconds);
  }

  async releaseLock(resource: string): Promise<void> {
    await this.del(`lock:${resource}`);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
