import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfigValidationSchema } from "./config.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: appConfigValidationSchema,
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
export class AppConfigModule {}
