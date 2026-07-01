import "reflect-metadata";
import express from "express";

const expressApp = express();
let cachedServer: any;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedServer) {
      const { NestFactory } = await import("@nestjs/core");
      const { ExpressAdapter } = await import("@nestjs/platform-express");
      const { AppModule } = await import("../src/app.module");
      const { ValidationPipe } = await import("@nestjs/common");
      const { ConfigService } = await import("@nestjs/config");
      const helmet = (await import("helmet")).default;
      const compression = (await import("compression")).default;
      const { AllExceptionsFilter } = await import("../src/common/filters/all-exceptions.filter");
      const { ResponseEnvelopeInterceptor } = await import("../src/common/interceptors/response-envelope.interceptor");
      const { RequestContextInterceptor } = await import("../src/common/interceptors/request-context.interceptor");
      const { AppLogger } = await import("../src/logging/app-logger.service");

      const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
      
      const logger = app.get(AppLogger);
      const config = app.get(ConfigService);
      
      app.useLogger(logger);
      app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
      const allowedOriginsStr = config.getOrThrow<string>("ALLOWED_ORIGINS");
      const allowedOrigins = allowedOriginsStr.split(',').map((o: string) => o.trim()).filter(Boolean);

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
    return cachedServer(req, res);
  } catch (err: any) {
    console.error("Vercel Startup Error:", err);
    res.status(500).json({
      error: "Vercel Startup Crash",
      message: err.message,
      stack: err.stack,
    });
  }
}
