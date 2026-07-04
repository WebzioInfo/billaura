import { Module } from "@nestjs/common";
import { PlatformController } from "./platform.controller";
import { DatabaseModule } from "../database/database.module";
import { AiController } from "./ai.controller";
import { AiInsightsService } from "./ai.service";

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformController, AiController],
  providers: [AiInsightsService],
})
export class PlatformModule {}
