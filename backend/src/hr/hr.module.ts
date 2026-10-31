import { Module } from "@nestjs/common";
import { HrService } from "./hr.service";
import { HrController } from "./hr.controller";
import { HrMastersService } from "./hr-masters.service";
import { HrMastersController } from "./hr-masters.controller";
import { DatabaseModule } from "../database/database.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [DatabaseModule, AccountingModule],
  controllers: [HrController, HrMastersController],
  providers: [HrService, HrMastersService],
  exports: [HrService, HrMastersService],
})
export class HrModule {}
