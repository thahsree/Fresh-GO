import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

import helmet from "helmet";
import * as express from "express";

async function bootstrap() {
  const logger = new Logger("FreshGoBootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);

  // Increase body parser limit to support document & licence photo uploads (up to 25MB)
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

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

      // Localhost, 127.0.0.1 & LAN IPs for local dev across any port (Expo, Vite, Next.js)
      if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
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
        /^https?:\/\/(.*\.duckdns\.org|65\.1\.74\.238)(:\d+)?$/.test(origin)
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
      "ngrok-skip-browser-warning",
      "bypass-tunnel-reminder",
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
  // Root Landing Page for Domain Verification & Status (returns 200 OK HTML for crawlers and web visitors)
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance();
  expressInstance.get("/", (req: express.Request, res: express.Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FreshGo - Fresh Groceries & Meat Delivery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .container { max-width: 680px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 48px 32px; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 8px 18px; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; margin-bottom: 24px; border: 1px solid rgba(52, 211, 153, 0.3); }
    .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; box-shadow: 0 0 12px #10b981; }
    h1 { font-size: 2.75rem; font-weight: 800; color: #ffffff; letter-spacing: -0.025em; margin-bottom: 16px; }
    h1 span { color: #10b981; }
    p.subtitle { font-size: 1.15rem; color: #94a3b8; line-height: 1.6; margin-bottom: 32px; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 36px; }
    .feature-card { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 20px 16px; }
    .feature-card h3 { font-size: 1.05rem; font-weight: 700; color: #e2e8f0; margin-bottom: 6px; }
    .feature-card p { font-size: 0.875rem; color: #94a3b8; }
    .footer { font-size: 0.85rem; color: #64748b; border-top: 1px solid #334155; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge"><span class="dot"></span> Online & Operational</div>
    <h1>Fresh<span>Go</span></h1>
    <p class="subtitle">Hyperlocal 15-minute delivery for premium fresh meats, poultry, seafood, farm-fresh produce, and daily grocery essentials.</p>
    <div class="features">
      <div class="feature-card">
        <h3>⚡ 15-Min Delivery</h3>
        <p>Instant dispatch from local fulfillment hubs</p>
      </div>
      <div class="feature-card">
        <h3>🥩 100% Fresh Meat</h3>
        <p>Hygienically cut, packed & chilled</p>
      </div>
      <div class="feature-card">
        <h3>📱 Mobile Experience</h3>
        <p>Available on Android & iOS</p>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 FreshGo. All rights reserved. &bull; Contact: support@freshgo.in
    </div>
  </div>
</body>
</html>`);
  });

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
