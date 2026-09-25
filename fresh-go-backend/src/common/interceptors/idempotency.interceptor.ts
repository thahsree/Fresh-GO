import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { Request } from "express";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only intercept mutating requests (POST, PUT, PATCH)
    if (!["POST", "PUT", "PATCH"].includes(request.method)) {
      return next.handle();
    }

    const idempotencyKey = (request.headers["idempotency-key"] ||
      request.headers["x-idempotency-key"]) as string;

    if (!idempotencyKey) {
      // If endpoint strictly requires it, handle in service or throw if marked
      return next.handle();
    }

    const redisKey = `idempotency:${idempotencyKey}`;
    const cachedState = await this.redisService.get(redisKey);

    if (cachedState) {
      try {
        const parsed = JSON.parse(cachedState);
        if (parsed.status === "PROCESSING") {
          throw new ConflictException(
            "A request with this Idempotency-Key is currently being processed. Please wait.",
          );
        }
        if (parsed.status === "COMPLETED") {
          // Return the already processed response
          return of(parsed.data);
        }
      } catch (e) {
        if (e instanceof ConflictException) throw e;
      }
    }

    // Mark as PROCESSING with 2-minute TTL in case of unhandled server crash
    await this.redisService.set(
      redisKey,
      JSON.stringify({ status: "PROCESSING", startedAt: Date.now() }),
      120,
    );

    return next.handle().pipe(
      tap(async (response) => {
        // Cache the completed response for 24 hours (86400 seconds)
        await this.redisService.set(
          redisKey,
          JSON.stringify({
            status: "COMPLETED",
            data: response,
            completedAt: Date.now(),
          }),
          86400,
        );
      }),
    );
  }
}
