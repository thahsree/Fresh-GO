import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

import helmet from "helmet";

async function bootstrap() {
  const logger = new Logger("FreshGoBootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);

  // Helmet Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  // Production-Ready Dynamic CORS Policy
  const allowedOriginsEnv = configService.get<string>("CORS_ORIGIN", "");
  const customOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. React Native mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Localhost & 127.0.0.1 for local dev across any port (Expo, Vite, Next.js)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Vercel preview & production deployments
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Configured custom domains or server IP
      if (
        customOrigins.includes(origin) ||
        customOrigins.includes("*") ||
        /^https?:\/\/65\.1\.74\.238(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Permissive fallback in development
      if (configService.get("NODE_ENV") !== "production") {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "Idempotency-Key",
      "X-Requested-With",
      "x-client-platform",
      "x-client-version",
    ],
    exposedHeaders: [
      "Idempotency-Key",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    credentials: true,
    maxAge: 86400,
  });

  // Global Route Prefix
  app.setGlobalPrefix("api/v1");

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Interceptors & Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global JWT Auth Guard (routes with @Public() bypass it)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("FreshGo Hyperlocal API")
    .setDescription(
      "Comprehensive REST & WebSocket Backend API for FreshGo Customer, Delivery, and Admin Control Tower",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port);
  logger.log(`🚀 FreshGo Server listening on: http://localhost:${port}/api/v1`);
  logger.log(
    `📚 Swagger API Docs available at: http://localhost:${port}/api/docs`,
  );
  logger.log(
    `⚡ WebSocket Tracking Gateway ready at: ws://localhost:${port}/tracking`,
  );
}

bootstrap();
