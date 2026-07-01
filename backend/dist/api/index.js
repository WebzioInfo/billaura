"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("../src/app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const all_exceptions_filter_1 = require("../src/common/filters/all-exceptions.filter");
const response_envelope_interceptor_1 = require("../src/common/interceptors/response-envelope.interceptor");
const request_context_interceptor_1 = require("../src/common/interceptors/request-context.interceptor");
const app_logger_service_1 = require("../src/logging/app-logger.service");
const express_1 = __importDefault(require("express"));
const expressApp = (0, express_1.default)();
let cachedServer;
async function bootstrap() {
    if (!cachedServer) {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp), { bufferLogs: true });
        const logger = app.get(app_logger_service_1.AppLogger);
        const config = app.get(config_1.ConfigService);
        app.useLogger(logger);
        app.setGlobalPrefix(config.getOrThrow("API_PREFIX"));
        const allowedOriginsStr = config.getOrThrow("ALLOWED_ORIGINS");
        const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim()).filter(Boolean);
        app.enableCors({
            origin: true,
            credentials: false,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: '*',
        });
        app.use((0, helmet_1.default)());
        app.use((0, compression_1.default)());
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }));
        app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter(logger));
        app.useGlobalInterceptors(new request_context_interceptor_1.RequestContextInterceptor(), new response_envelope_interceptor_1.ResponseEnvelopeInterceptor());
        await app.init();
        cachedServer = expressApp;
    }
    return cachedServer;
}
async function handler(req, res) {
    try {
        const server = await bootstrap();
        return server(req, res);
    }
    catch (err) {
        console.error("Vercel Startup Error:", err);
        res.status(500).json({
            error: "Vercel Startup Crash",
            message: err?.message,
            stack: err?.stack,
        });
    }
}
//# sourceMappingURL=index.js.map