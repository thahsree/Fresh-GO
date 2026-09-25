import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

async function bootstrap() {
  const logger = new Logger("FreshGoBootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);

  // Enable CORS
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
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
