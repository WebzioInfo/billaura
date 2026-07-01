"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const response_envelope_interceptor_1 = require("./common/interceptors/response-envelope.interceptor");
const request_context_interceptor_1 = require("./common/interceptors/request-context.interceptor");
const app_logger_service_1 = require("./logging/app-logger.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
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
    app.enableShutdownHooks();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter(logger));
    app.useGlobalInterceptors(new request_context_interceptor_1.RequestContextInterceptor(), new response_envelope_interceptor_1.ResponseEnvelopeInterceptor());
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle("Bill Aura API")
        .setDescription("Enterprise migration API foundation")
        .setVersion("0.1.0")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup("docs", app, document);
    const port = config.get("PORT", 4000);
    await app.listen(port);
    logger.log(`Backend foundation listening on port ${port}`, "Bootstrap");
}
void bootstrap();
//# sourceMappingURL=main.js.map