import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { RequestContextInterceptor } from "./common/interceptors/request-context.interceptor";
import { NoCacheInterceptor } from "./common/interceptors/no-cache.interceptor";
import { AppLogger } from "./logging/app-logger.service";

import { corsOptions } from "./config/cors.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  const config = app.get(ConfigService);

  app.useLogger(logger);
  app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
  
  const allowedOrigins = config.getOrThrow<string>("ALLOWED_ORIGINS")
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors(corsOptions(allowedOrigins));

  app.use(helmet());
  app.use(compression());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
    })
  );
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  app.useGlobalInterceptors(
    new RequestContextInterceptor(),
    new ResponseEnvelopeInterceptor(),
    new NoCacheInterceptor(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Bill Aura API")
    .setDescription("Enterprise migration API foundation")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  logger.log(`Backend foundation listening on port ${port}`, "Bootstrap");
}

void bootstrap();
