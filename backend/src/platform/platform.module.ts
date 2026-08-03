import { Module } from "@nestjs/common";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";
import { DatabaseModule } from "../database/database.module";
import { AiController } from "./ai.controller";
import { AiInsightsService } from "./ai.service";
import { TenantProvisioningModule } from "./provisioning/tenant-provisioning.module";

@Module({
  imports: [DatabaseModule, TenantProvisioningModule],
  controllers: [PlatformController, AiController],
  providers: [PlatformService, AiInsightsService],
  exports: [PlatformService],
})
export class PlatformModule {}
