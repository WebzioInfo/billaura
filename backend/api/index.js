const moduleLoadStartedAt = performance.now();
const moduleLog = (message) => console.log(`[${new Date().toISOString()}] ${message}`);
moduleLog("MODULE LOAD START");

require("reflect-metadata");
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const helmet = require('helmet');
const compression = require('compression');
const express = require('express');
moduleLog(`FRAMEWORK MODULES LOADED (${(performance.now() - moduleLoadStartedAt).toFixed(2)} ms)`);

let AppModule, AllExceptionsFilter, ResponseEnvelopeInterceptor, RequestContextInterceptor, AppLogger, corsOptions;
const applicationModulesStartedAt = performance.now();
try {
  AppModule = require('../dist/app.module').AppModule;
  AllExceptionsFilter = require('../dist/common/filters/all-exceptions.filter').AllExceptionsFilter;
  ResponseEnvelopeInterceptor = require('../dist/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
  RequestContextInterceptor = require('../dist/common/interceptors/request-context.interceptor').RequestContextInterceptor;
  AppLogger = require('../dist/logging/app-logger.service').AppLogger;
  corsOptions = require('../dist/config/cors.config').corsOptions;
} catch (e) {
  AppModule = require('../dist/src/app.module').AppModule;
  AllExceptionsFilter = require('../dist/src/common/filters/all-exceptions.filter').AllExceptionsFilter;
  ResponseEnvelopeInterceptor = require('../dist/src/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
  RequestContextInterceptor = require('../dist/src/common/interceptors/request-context.interceptor').RequestContextInterceptor;
  AppLogger = require('../dist/src/logging/app-logger.service').AppLogger;
  corsOptions = require('../dist/src/config/cors.config').corsOptions;
}
moduleLog(`APPLICATION MODULES LOADED (${(performance.now() - applicationModulesStartedAt).toFixed(2)} ms)`);

const expressApp = express();


let isInitialized = false;
let initPromise = null;
let startupLogs = [];
const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    startupLogs.push(entry);
    console.log(entry);
};

async function bootstrap() {
    const bootstrapStartedAt = performance.now();
    log("BOOTSTRAP START");
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
    log(`Nest Initialized (${(performance.now() - bootstrapStartedAt).toFixed(2)} ms)`);
    
    const logger = app.get(AppLogger);
    const config = app.get(ConfigService);
  
    app.useLogger(logger);
    app.setGlobalPrefix(config.getOrThrow("API_PREFIX"));
    const allowedOrigins = config.getOrThrow("ALLOWED_ORIGINS")
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    
    app.enableCors(corsOptions(allowedOrigins));
    
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
  
    const initStartedAt = performance.now();
    log("START app.init");
    await app.init();
    log(`END app.init (${(performance.now() - initStartedAt).toFixed(2)} ms)`);
    log("Routes Registered");
    isInitialized = true;
    log(`BOOTSTRAP COMPLETE (${(performance.now() - bootstrapStartedAt).toFixed(2)} ms)`);
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
        console.error(`[Vercel Handler] CRITICAL ERROR: ${err.message}`, err);
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

module.exports.config = {
    api: {
        bodyParser: false,
    },
};
