import { Module } from "@nestjs/common";
import { CashController } from "./cash.controller";
import { CashService } from "./cash.service";
import { BankController } from "./bank.controller";
import { BankService } from "./bank.service";
import { ReconciliationController } from "./reconciliation.controller";
import { ReconciliationService } from "./reconciliation.service";
import { AdvancesController } from "./advances.controller";
import { AdvancesService } from "./advances.service";

@Module({
  controllers: [
    AdvancesController,
    CashController,
    BankController,
    ReconciliationController,
  ],
  providers: [AdvancesService, CashService, BankService, ReconciliationService],
})
export class FinanceModule {}
