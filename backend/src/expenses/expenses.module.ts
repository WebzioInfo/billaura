import { Module } from "@nestjs/common";
import { ExpensesService } from "./expenses.service";
import { ExpensesController } from "./expenses.controller";
import { DatabaseModule } from "../database/database.module";
import { AccountingModule } from "../accounting/accounting.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [DatabaseModule, AccountingModule, SharedModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
