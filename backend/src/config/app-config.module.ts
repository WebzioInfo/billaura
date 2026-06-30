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
          FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
          NODE_ENV: process.env.NODE_ENV ?? "development",
          PORT: Number(process.env.PORT ?? 4000),
        }),
      ],
    }),
  ],
})
export class AppConfigModule {}
