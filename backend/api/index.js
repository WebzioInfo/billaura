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
  const appMod = require('../dist/app.module');
  AppModule = appMod.AppModule;
  AllExceptionsFilter = require('../dist/common/filters/all-exceptions.filter').AllExceptionsFilter;
  ResponseEnvelopeInterceptor = require('../dist/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
  RequestContextInterceptor = require('../dist/common/interceptors/request-context.interceptor').RequestContextInterceptor;
  AppLogger = require('../dist/logging/app-logger.service').AppLogger;
  corsOptions = require('../dist/config/cors.config').corsOptions;
  moduleLog(`APPLICATION MODULES LOADED from ../dist (${(performance.now() - applicationModulesStartedAt).toFixed(2)} ms)`);
} catch (e1) {
  try {
    const appMod = require('../dist/src/app.module');
    AppModule = appMod.AppModule;
    AllExceptionsFilter = require('../dist/src/common/filters/all-exceptions.filter').AllExceptionsFilter;
    ResponseEnvelopeInterceptor = require('../dist/src/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
    RequestContextInterceptor = require('../dist/src/common/interceptors/request-context.interceptor').RequestContextInterceptor;
    AppLogger = require('../dist/src/logging/app-logger.service').AppLogger;
    corsOptions = require('../dist/src/config/cors.config').corsOptions;
    moduleLog(`APPLICATION MODULES LOADED from ../dist/src (${(performance.now() - applicationModulesStartedAt).toFixed(2)} ms)`);
  } catch (e2) {
    console.error(`[MODULE LOAD ERROR] Failed to load application modules: ${e1.message} | ${e2.message}`);
  }
}

const expressApp = express();

let isInitialized = false;
let initPromise = null;
let startupLogs = [];
const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    startupLogs.push(entry);
    console.log(entry);
};

const DEFAULT_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://billaura.webziotech.in',
    'https://billaura.webziointernational.in',
    'https://billaura-sage.vercel.app'
];

function applyCorsHeaders(req, res) {
    const requestOrigin = req.headers.origin;
    if (requestOrigin) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type,Authorization,Accept,x-company-id,x-tenant-id,x-request-id,Cache-Control,Pragma,Expires,X-CSRF-Token,X-Requested-With'
    );
    res.setHeader('Access-Control-Expose-Headers', 'x-request-id');
}

async function bootstrap() {
    const bootstrapStartedAt = performance.now();
    log("BOOTSTRAP START");
    if (!AppModule) {
        throw new Error("AppModule failed to load. Please verify dist/ build artifacts are included.");
    }

    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
    log(`Nest Initialized (${(performance.now() - bootstrapStartedAt).toFixed(2)} ms)`);
    
    const logger = app.get(AppLogger);
    const config = app.get(ConfigService);
  
    app.useLogger(logger);
    app.setGlobalPrefix(config.get("API_PREFIX") || "api");

    const rawOrigins = config.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(',');
    const allowedOrigins = rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    
    if (corsOptions) {
      app.enableCors(corsOptions(allowedOrigins));
    }
    
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
        timer = setTimeout(() => reject(new Error(`Bootstrap timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    // Immediate fast preflight response
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
    }

    try {
        if (!isInitialized) {
            log("Initializing NestJS app...");
            if (!initPromise) {
                initPromise = bootstrap();
            }
            await withTimeout(initPromise, 25000);
        }
        return expressApp(req, res);
    } catch (err) {
        console.error(`[Vercel Handler] CRITICAL ERROR: ${err.message}`, err);
        applyCorsHeaders(req, res);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        return res.end(JSON.stringify({ 
            error: "Backend Startup Error", 
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
