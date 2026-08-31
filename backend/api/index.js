let topLevelError = null;
let topLevelLogs = [];
const log = (msg) => {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  topLevelLogs.push(entry);
  console.log(entry);
};

log("TOP LEVEL SCRIPT START");

let path, fs, NestFactory, ExpressAdapter, ValidationPipe, ConfigService, helmet, compression, express;
let AppModule, AllExceptionsFilter, ResponseEnvelopeInterceptor, RequestContextInterceptor, AppLogger, corsOptions;
let expressApp;
let isInitialized = false;
let initPromise = null;

try {
  path = require('path');
  fs = require('fs');
  require("reflect-metadata");
  
  const nestCore = require('@nestjs/core');
  NestFactory = nestCore.NestFactory;
  
  const nestPlatformExpress = require('@nestjs/platform-express');
  ExpressAdapter = nestPlatformExpress.ExpressAdapter;
  
  const nestCommon = require('@nestjs/common');
  ValidationPipe = nestCommon.ValidationPipe;
  
  const nestConfig = require('@nestjs/config');
  ConfigService = nestConfig.ConfigService;
  
  helmet = require('helmet');
  compression = require('compression');
  express = require('express');
  expressApp = express();
  
  log("FRAMEWORK DEPENDENCIES LOADED");
} catch (err) {
  topLevelError = {
    phase: "framework_load",
    message: err.message,
    stack: err.stack,
  };
  console.error("[TOP LEVEL LOAD ERROR]", err);
}

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://billaura.webziotech.in',
  'https://billaura.webziointernational.in',
  'https://billaura-sage.vercel.app'
];

function applyCorsHeaders(req, res) {
  const requestOrigin = req.headers ? req.headers.origin : undefined;
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

function loadApplicationModules() {
  if (AppModule) return true;
  
  const candidateBases = [
    path.resolve(__dirname, '../dist'),
    path.resolve(__dirname, '../../dist'),
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'backend/dist'),
    path.resolve(process.cwd(), 'apps/backend/dist'),
  ];

  const errors = [];
  for (const base of candidateBases) {
    const target = path.join(base, 'app.module.js');
    try {
      if (fs.existsSync(base)) {
        log(`Found base directory at ${base}`);
      }
      if (fs.existsSync(target)) {
        log(`Found target file at ${target}`);
        const appMod = require(target);
        AppModule = appMod.AppModule;
        AllExceptionsFilter = require(path.join(base, 'common/filters/all-exceptions.filter.js')).AllExceptionsFilter;
        ResponseEnvelopeInterceptor = require(path.join(base, 'common/interceptors/response-envelope.interceptor.js')).ResponseEnvelopeInterceptor;
        RequestContextInterceptor = require(path.join(base, 'common/interceptors/request-context.interceptor.js')).RequestContextInterceptor;
        AppLogger = require(path.join(base, 'logging/app-logger.service.js')).AppLogger;
        corsOptions = require(path.join(base, 'config/cors.config.js')).corsOptions;
        log(`Application modules loaded successfully from ${base}`);
        return true;
      }
    } catch (e) {
      log(`Error loading from ${base}: ${e.message}`);
      errors.push({ base, message: e.message, stack: e.stack });
    }
  }

  // Direct require fallback
  try {
    const appMod = require('../dist/app.module');
    AppModule = appMod.AppModule;
    AllExceptionsFilter = require('../dist/common/filters/all-exceptions.filter').AllExceptionsFilter;
    ResponseEnvelopeInterceptor = require('../dist/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
    RequestContextInterceptor = require('../dist/common/interceptors/request-context.interceptor').RequestContextInterceptor;
    AppLogger = require('../dist/logging/app-logger.service').AppLogger;
    corsOptions = require('../dist/config/cors.config').corsOptions;
    return true;
  } catch (e) {
    errors.push({ fallback: '../dist/app.module', message: e.message, stack: e.stack });
  }

  let dirListing = '';
  try {
    dirListing = `cwd: ${process.cwd()} [${fs.readdirSync(process.cwd()).join(',')}], __dirname: ${__dirname} [${fs.readdirSync(__dirname).join(',')}]`;
    if (fs.existsSync(path.resolve(__dirname, '..'))) {
      dirListing += ` | parent: [${fs.readdirSync(path.resolve(__dirname, '..')).join(',')}]`;
    }
  } catch (e) {
    dirListing = `fs error: ${e.message}`;
  }

  throw new Error(`Failed to load AppModule. ${dirListing} | errors: ${JSON.stringify(errors)}`);
}

async function bootstrap() {
  log("BOOTSTRAP START");
  loadApplicationModules();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
  log("NestFactory app instance created");
  
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

  log("START app.init()");
  await app.init();
  log("END app.init() - Routes Registered");
  isInitialized = true;
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

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (topLevelError) {
    applyCorsHeaders(req, res);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(JSON.stringify({
      error: "Top Level Module Load Error",
      details: topLevelError,
      logs: topLevelLogs
    }));
  }

  try {
    if (!isInitialized) {
      log("Initializing NestJS Application...");
      if (!initPromise) {
        initPromise = bootstrap();
      }
      await withTimeout(initPromise, 25000);
    }
    return expressApp(req, res);
  } catch (err) {
    initPromise = null;
    console.error(`[Vercel Serverless Handler Error] ${err.message}`, err);
    applyCorsHeaders(req, res);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(JSON.stringify({
      error: "Backend Startup Error",
      message: err.message,
      logs: topLevelLogs
    }));
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
