"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const config_validation_1 = require("./config.validation");
let AppConfigModule = class AppConfigModule {
};
exports.AppConfigModule = AppConfigModule;
exports.AppConfigModule = AppConfigModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                envFilePath: [".env.local", ".env"],
                validationSchema: config_validation_1.appConfigValidationSchema,
                validationOptions: {
                    allowUnknown: true,
                    abortEarly: false,
                },
                load: [
                    () => ({
                        API_PREFIX: process.env.API_PREFIX ?? "api",
                        DATABASE_URL: process.env.DATABASE_URL,
                        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
                        JWT_SECRET: process.env.JWT_SECRET,
                        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
                        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "15m",
                        JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
                        NODE_ENV: process.env.NODE_ENV ?? "development",
                        PORT: Number(process.env.PORT ?? 4000),
                        SMTP_HOST: process.env.SMTP_HOST,
                        SMTP_PORT: Number(process.env.SMTP_PORT),
                        SMTP_USER: process.env.SMTP_USER,
                        SMTP_PASSWORD: process.env.SMTP_PASSWORD,
                        CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
                        CLOUDINARY_KEY: process.env.CLOUDINARY_KEY,
                        CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET,
                    }),
                ],
            }),
        ],
    })
], AppConfigModule);
//# sourceMappingURL=app-config.module.js.map