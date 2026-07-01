import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { AppModule } from "../src/app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import compression from "compression";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { ResponseEnvelopeInterceptor } from "../src/common/interceptors/response-envelope.interceptor";
import { RequestContextInterceptor } from "../src/common/interceptors/request-context.interceptor";
import { AppLogger } from "../src/logging/app-logger.service";
import express from "express";

const expressApp = express();
let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
    
    const logger = app.get(AppLogger);
    const config = app.get(ConfigService);
    
    app.useLogger(logger);
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    const allowedOriginsStr = config.getOrThrow<string>("ALLOWED_ORIGINS");
    const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim()).filter(Boolean);

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization, x-tenant-id, x-company-id',
    });
    
    app.use(helmet());
    app.use(compression());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(logger));
    app.useGlobalInterceptors(new RequestContextInterceptor(), new ResponseEnvelopeInterceptor());

    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  try {
    const server = await bootstrap();
    return server(req, res);
  } catch (err: any) {
    console.error("Vercel Startup Error:", err);
    res.status(500).json({
      error: "Vercel Startup Crash",
      message: err?.message,
      stack: err?.stack,
    });
  }
}
