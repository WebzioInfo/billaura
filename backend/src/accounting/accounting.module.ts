import { Module } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { AccountsController } from "./accounts.controller";
import { JournalEntriesService } from "./journal-entries.service";
import { JournalEntriesController } from "./journal-entries.controller";
import { BankAccountsController } from "./bank-accounts.controller";
import { CapitalController } from "./capital.controller";
import { CapitalService } from "./capital.service";
import { CostCentersService } from "./cost-centers.service";
import { CostCentersController } from "./cost-centers.controller";
import { FixedAssetsController } from "./fixed-assets.controller";
import { FixedAssetsService } from "./fixed-assets.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AccountsController,
    JournalEntriesController,
    BankAccountsController,
    CapitalController,
    CostCentersController,
    FixedAssetsController,
    ProjectsController,
  ],
  providers: [
    AccountsService,
    JournalEntriesService,
    CapitalService,
    CostCentersService,
    FixedAssetsService,
    ProjectsService,
  ],
  exports: [
    AccountsService,
    JournalEntriesService,
    CapitalService,
    CostCentersService,
    FixedAssetsService,
    ProjectsService,
  ],
})
export class AccountingModule {}
