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
let startupLogs = [];
const log = (msg) => { startupLogs.push(`[${new Date().toISOString()}] ${msg}`); };

async function bootstrap() {
    log("bootstrap started");
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
    log("NestFactory.create finished");
    
    const logger = app.get(AppLogger);
    const config = app.get(ConfigService);
  
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
  
    log("Before app.init()");
    await app.init();
    log("After app.init()");
    isInitialized = true;
}

async function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = async (req, res) => {
    try {
        if (!isInitialized) {
            log("Initializing...");
            if (!initPromise) {
                initPromise = bootstrap();
            }
            await withTimeout(initPromise, 5000);
        }
        return expressApp(req, res);
    } catch (err) {
        // If it's a timeout, return 500 immediately with the logs
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        return res.end(JSON.stringify({ 
            error: "Startup Crash or Timeout", 
            message: err.message, 
            logs: startupLogs
        }));
    }
};
