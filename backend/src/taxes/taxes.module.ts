import { Module } from "@nestjs/common";
import { TaxesService } from "./taxes.service";
import { TaxesController } from "./taxes.controller";
import { DatabaseModule } from "../database/database.module";

import { TaxEngineService } from "./tax-engine.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TaxesController],
  providers: [TaxesService, TaxEngineService],
  exports: [TaxesService, TaxEngineService],
})
export class TaxesModule {}
