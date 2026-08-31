const path = require('path');
const fs = require('fs');

const moduleLoadStartedAt = performance.now();
const moduleLog = (message) => console.log(`[${new Date().toISOString()}] ${message}`);
moduleLog("MODULE LOAD START");

// Static require hint so Vercel NFT (Node File Trace) includes dist in the lambda bundle
try {
  require('../dist/app.module.js');
} catch (_) {}

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

function loadAppModules() {
  const candidatePaths = [
    { base: path.resolve(__dirname, '../dist'), name: 'dist' },
    { base: path.resolve(__dirname, '../../dist'), name: '../dist' },
    { base: path.resolve(process.cwd(), 'dist'), name: 'cwd/dist' },
    { base: path.resolve(process.cwd(), 'backend/dist'), name: 'cwd/backend/dist' },
    { base: path.resolve(process.cwd(), 'apps/backend/dist'), name: 'cwd/apps/backend/dist' },
  ];

  for (const { base, name } of candidatePaths) {
    try {
      const appModulePath = path.join(base, 'app.module.js');
      if (fs.existsSync(appModulePath) || fs.existsSync(path.join(base, 'app.module'))) {
        AppModule = require(path.join(base, 'app.module')).AppModule;
        AllExceptionsFilter = require(path.join(base, 'common/filters/all-exceptions.filter')).AllExceptionsFilter;
        ResponseEnvelopeInterceptor = require(path.join(base, 'common/interceptors/response-envelope.interceptor')).ResponseEnvelopeInterceptor;
        RequestContextInterceptor = require(path.join(base, 'common/interceptors/request-context.interceptor')).RequestContextInterceptor;
        AppLogger = require(path.join(base, 'logging/app-logger.service')).AppLogger;
        corsOptions = require(path.join(base, 'config/cors.config')).corsOptions;
        moduleLog(`APPLICATION MODULES LOADED from ${name} (${(performance.now() - applicationModulesStartedAt).toFixed(2)} ms)`);
        return true;
      }
    } catch (e) {
      console.warn(`[MODULE LOAD] Tried ${name} but encountered error:`, e.message);
    }
  }

  // Fallback direct require
  try {
    AppModule = require('../dist/app.module').AppModule;
    AllExceptionsFilter = require('../dist/common/filters/all-exceptions.filter').AllExceptionsFilter;
    ResponseEnvelopeInterceptor = require('../dist/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
    RequestContextInterceptor = require('../dist/common/interceptors/request-context.interceptor').RequestContextInterceptor;
    AppLogger = require('../dist/logging/app-logger.service').AppLogger;
    corsOptions = require('../dist/config/cors.config').corsOptions;
    return true;
  } catch (e) {
    console.error(`[MODULE LOAD ERROR] Failed to load application modules: ${e.message}`);
    return false;
  }
}

loadAppModules();

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
        const loaded = loadAppModules();
        if (!loaded || !AppModule) {
            let debugInfo = `cwd: ${process.cwd()}, __dirname: ${__dirname}`;
            try {
                debugInfo += ` | files in __dirname: ${fs.readdirSync(__dirname).join(',')}`;
                debugInfo += ` | files in parent: ${fs.readdirSync(path.resolve(__dirname, '..')).join(',')}`;
            } catch (e) {
                debugInfo += ` | fs error: ${e.message}`;
            }
            throw new Error(`AppModule failed to load. (${debugInfo})`);
        }
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
