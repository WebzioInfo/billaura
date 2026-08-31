const path = require('path');
const fs = require('fs');

const moduleLoadStartedAt = performance.now();
const moduleLog = (message) => console.log(`[${new Date().toISOString()}] ${message}`);
moduleLog("MODULE LOAD START");

// Static require hints so Vercel NFT (Node File Trace) includes dist, Prisma client and modules in the lambda bundle
try {
  require('../dist/app.module.js');
  require('@prisma/client');
  require('bcrypt');
  require('pg');
  require('@nestjs/jwt');
  require('@nestjs/passport');
  require('passport-jwt');
  require('nodemailer');
  require('archiver');
  require('date-fns');
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

let moduleLoadErrors = [];

function loadAppModules() {
  moduleLoadErrors = [];
  const candidateBases = [
    path.resolve(__dirname, '../dist'),
    path.resolve(__dirname, '../../dist'),
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'backend/dist'),
    path.resolve(process.cwd(), 'apps/backend/dist'),
  ];

  for (const base of candidateBases) {
    const appModulePath = path.join(base, 'app.module.js');
    try {
      if (fs.existsSync(base)) {
        const distFiles = fs.readdirSync(base);
        startupLogs.push(`Checked base ${base} (found: ${distFiles.slice(0, 10).join(', ')})`);
      }
      
      const appMod = require(path.join(base, 'app.module.js'));
      AppModule = appMod.AppModule;
      AllExceptionsFilter = require(path.join(base, 'common/filters/all-exceptions.filter.js')).AllExceptionsFilter;
      ResponseEnvelopeInterceptor = require(path.join(base, 'common/interceptors/response-envelope.interceptor.js')).ResponseEnvelopeInterceptor;
      RequestContextInterceptor = require(path.join(base, 'common/interceptors/request-context.interceptor.js')).RequestContextInterceptor;
      AppLogger = require(path.join(base, 'logging/app-logger.service.js')).AppLogger;
      corsOptions = require(path.join(base, 'config/cors.config.js')).corsOptions;
      
      startupLogs.push(`Successfully loaded AppModule from ${base}`);
      return true;
    } catch (e) {
      moduleLoadErrors.push({ base, error: e.message, stack: e.stack });
      startupLogs.push(`Failed loading from ${base}: ${e.message}`);
    }
  }

  return false;
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
                debugInfo += ` | load errors: ${JSON.stringify(moduleLoadErrors)}`;
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
        initPromise = null;
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
