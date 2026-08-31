const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://billaura.webziotech.in',
  'https://billaura.webziointernational.in',
  'https://billaura-sage.vercel.app'
];

function applyCorsHeaders(req, res) {
  const requestOrigin = req && req.headers ? req.headers.origin : undefined;
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

let isInitialized = false;
let initPromise = null;
let cachedExpressApp = null;
let startupLogs = [];

const log = (msg) => {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  startupLogs.push(entry);
  console.log(entry);
};

async function bootstrap() {
  const bootstrapStart = performance.now();
  log("BOOTSTRAP START");

  const path = require('path');
  const fs = require('fs');
  require("reflect-metadata");

  const { NestFactory } = require('@nestjs/core');
  const { ExpressAdapter } = require('@nestjs/platform-express');
  const { ValidationPipe } = require('@nestjs/common');
  const { ConfigService } = require('@nestjs/config');
  const helmet = require('helmet');
  const compression = require('compression');
  const express = require('express');

  const expressApp = express();
  log(`Framework modules loaded (${(performance.now() - bootstrapStart).toFixed(2)} ms)`);

  const candidateBases = [
    path.resolve(__dirname, '../dist'),
    path.resolve(__dirname, '../../dist'),
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'backend/dist'),
    path.resolve(process.cwd(), 'apps/backend/dist'),
  ];

  let AppModule, AllExceptionsFilter, ResponseEnvelopeInterceptor, RequestContextInterceptor, AppLogger, corsOptions;
  let loadErrors = [];

  for (const base of candidateBases) {
    const target = path.join(base, 'app.module.js');
    try {
      if (fs.existsSync(target)) {
        log(`Found AppModule at ${target}`);
        AppModule = require(target).AppModule;
        AllExceptionsFilter = require(path.join(base, 'common/filters/all-exceptions.filter.js')).AllExceptionsFilter;
        ResponseEnvelopeInterceptor = require(path.join(base, 'common/interceptors/response-envelope.interceptor.js')).ResponseEnvelopeInterceptor;
        RequestContextInterceptor = require(path.join(base, 'common/interceptors/request-context.interceptor.js')).RequestContextInterceptor;
        AppLogger = require(path.join(base, 'logging/app-logger.service.js')).AppLogger;
        corsOptions = require(path.join(base, 'config/cors.config.js')).corsOptions;
        log(`AppModule loaded from ${base}`);
        break;
      }
    } catch (e) {
      loadErrors.push({ base, error: e.message, stack: e.stack });
      log(`Failed requiring from ${base}: ${e.message}`);
    }
  }

  if (!AppModule) {
    try {
      AppModule = require('../dist/app.module').AppModule;
      AllExceptionsFilter = require('../dist/common/filters/all-exceptions.filter').AllExceptionsFilter;
      ResponseEnvelopeInterceptor = require('../dist/common/interceptors/response-envelope.interceptor').ResponseEnvelopeInterceptor;
      RequestContextInterceptor = require('../dist/common/interceptors/request-context.interceptor').RequestContextInterceptor;
      AppLogger = require('../dist/logging/app-logger.service').AppLogger;
      corsOptions = require('../dist/config/cors.config').corsOptions;
    } catch (e) {
      loadErrors.push({ fallback: '../dist/app.module', error: e.message, stack: e.stack });
    }
  }

  if (!AppModule) {
    let debug = `cwd: ${process.cwd()}, __dirname: ${__dirname}`;
    try {
      debug += ` | files in parent: ${fs.readdirSync(path.resolve(__dirname, '..')).join(',')}`;
    } catch (_) {}
    throw new Error(`AppModule could not be loaded. (${debug}) Errors: ${JSON.stringify(loadErrors)}`);
  }

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true });
  log(`NestFactory created (${(performance.now() - bootstrapStart).toFixed(2)} ms)`);

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
  log(`END app.init() (${(performance.now() - bootstrapStart).toFixed(2)} ms)`);

  cachedExpressApp = expressApp;
  isInitialized = true;
  return expressApp;
}

module.exports = async (req, res) => {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    if (!isInitialized) {
      if (!initPromise) {
        initPromise = bootstrap();
      }
      await initPromise;
    }
    return cachedExpressApp(req, res);
  } catch (err) {
    initPromise = null;
    console.error(`[CRITICAL HANDLER ERROR] ${err.message}`, err);
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
