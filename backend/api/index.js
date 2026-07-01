require("reflect-metadata");
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const helmet = require('helmet');
const compression = require('compression');
const express = require('express');

let AppModule, AllExceptionsFilter, ResponseEnvelopeInterceptor, RequestContextInterceptor, AppLogger;
try {
  AppModule = require('../dist/app.module').AppModule;
  AllExceptionsFilter = require('../dist/common/filters/all-exceptions.filter').AllExceptionsFilter;
  ResponseEnvelopeInterceptor = require('../dist/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
  RequestContextInterceptor = require('../dist/common/interceptors/request-context.interceptor').RequestContextInterceptor;
  AppLogger = require('../dist/logging/app-logger.service').AppLogger;
} catch (e) {
  AppModule = require('../dist/src/app.module').AppModule;
  AllExceptionsFilter = require('../dist/src/common/filters/all-exceptions.filter').AllExceptionsFilter;
  ResponseEnvelopeInterceptor = require('../dist/src/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
  RequestContextInterceptor = require('../dist/src/common/interceptors/request-context.interceptor').RequestContextInterceptor;
  AppLogger = require('../dist/src/logging/app-logger.service').AppLogger;
}

const expressApp = express();
let isInitialized = false;
let initPromise = null;
let bootstrapLog = [];

function logProgress(msg) {
    console.log(`[Bootstrap] ${msg}`);
    bootstrapLog.push(msg);
}

async function withTimeout(promise, ms, name) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms during: ${name}`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function bootstrap() {
    logProgress("Starting NestFactory.create");
    const app = await withTimeout(NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true }), 4000, "NestFactory.create");
    
    logProgress("NestFactory.create finished. Getting providers");
    const logger = app.get(AppLogger);
    const config = app.get(ConfigService);
  
    logProgress("Applying middleware and config");
    app.useLogger(logger);
    app.setGlobalPrefix(config.getOrThrow("API_PREFIX"));
    
    app.enableCors({
      origin: true,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: '*',
    });
    
    const helmetMiddleware = helmet.default || helmet;
    app.use(helmetMiddleware());
    
    const compressionMiddleware = compression.default || compression;
    app.use(compressionMiddleware());
  
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
  
    logProgress("Starting app.init()");
    await withTimeout(app.init(), 4000, "app.init()");
    logProgress("app.init() finished");
    
    isInitialized = true;
}

expressApp.use(async (req, res, next) => {
    try {
        if (!isInitialized) {
            if (!initPromise) {
                initPromise = bootstrap();
            }
            await initPromise;
        }
        next();
    } catch (err) {
        console.error("Vercel Startup Error:", err);
        res.status(500).json({ 
            error: "Startup Crash", 
            message: err.message, 
            stack: err.stack,
            progress: bootstrapLog
        });
    }
});

module.exports = expressApp;
