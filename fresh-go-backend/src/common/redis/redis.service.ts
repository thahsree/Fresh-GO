import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { stopLocalRedis } from "./local-redis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly memoryCache = new Map<string, { value: string; expiresAt?: number }>();
  private isRedisHealthy = false;
  private hasLoggedQuotaError = false;

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

      const sanitizedUrl = redisUrl.replace(/\/\/[^@]*@/, "//***@");
      this.logger.log(`Initializing Redis client via REDIS_URL (${sanitizedUrl})`);
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 3000, 30000),
      });
    } else {
      const host = this.configService.get<string>("REDIS_HOST", "localhost");
      const port = this.configService.get<number>("REDIS_PORT", 6379);
      const password = this.configService.get<string>("REDIS_PASSWORD", "");
      const rawTls = this.configService.get<string | boolean>("REDIS_TLS", false);
      const useTls =
        rawTls === true || rawTls === "true" || host.includes("upstash.io");

      this.logger.log(
        `Initializing Redis client at ${host}:${port} (TLS: ${useTls})`,
      );
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        tls: useTls ? {} : undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 3000, 30000),
      });
    }

    this.client.on("connect", () => {
      this.isRedisHealthy = true;
      this.hasLoggedQuotaError = false;
      this.logger.log("✅ Redis client connected successfully");
    });

    this.client.on("error", (err: any) => {
      this.isRedisHealthy = false;
      if (err?.message?.includes("max requests limit exceeded")) {
        if (!this.hasLoggedQuotaError) {
          this.hasLoggedQuotaError = true;
          this.logger.warn(
            "⚠️ Upstash Redis daily request limit (500k) exceeded. Switched to high-speed in-memory cache mode.",
          );
        }
      } else {
        this.logger.warn(
          `Redis connection warning (running in in-memory fallback cache mode): ${err.message}`,
        );
      }
    });

    this.client.connect().catch((err: any) => {
      this.isRedisHealthy = false;
      if (!this.hasLoggedQuotaError && err?.message?.includes("max requests limit exceeded")) {
        this.hasLoggedQuotaError = true;
        this.logger.warn(
          "⚠️ Upstash Redis daily request limit (500k) exceeded. Switched to high-speed in-memory cache mode.",
        );
      }
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (this.isRedisHealthy) {
      try {
        return await this.client.get(key);
      } catch (error: any) {
        if (error.message?.includes("max requests limit exceeded")) {
          this.isRedisHealthy = false;
        }
      }
    }
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, { value, expiresAt });

    if (this.isRedisHealthy) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, "EX", ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
      } catch (error: any) {
        if (error.message?.includes("max requests limit exceeded")) {
          this.isRedisHealthy = false;
        }
      }
    }
  }

  async setnx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const existing = await this.get(key);
    if (existing !== null) return false;
    await this.set(key, value, ttlSeconds);
    return true;
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
    if (this.isRedisHealthy) {
      try {
        await this.client.del(key);
      } catch (error: any) {
        if (error.message?.includes("max requests limit exceeded")) {
          this.isRedisHealthy = false;
        }
      }
    }
  }

  async acquireLock(resource: string, ttlSeconds = 10): Promise<boolean> {
    return this.setnx(`lock:${resource}`, "1", ttlSeconds);
  }

  async releaseLock(resource: string): Promise<void> {
    await this.del(`lock:${resource}`);
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {}
    stopLocalRedis();
  }
}
