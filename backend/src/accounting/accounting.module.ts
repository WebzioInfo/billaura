import { Module } from '@nestjs/common';
import { AccountingEngineService } from './accounting-engine.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { BankAccountsController } from './bank-accounts.controller';
import { CapitalController } from './capital.controller';
import { CapitalService } from './capital.service';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';
import { FixedAssetsController } from './fixed-assets.controller';
import { FixedAssetsService } from './fixed-assets.service';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JournalPostingService } from './journal-posting.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AccountsController,
    BankAccountsController,
    CapitalController,
    CostCentersController,
    FixedAssetsController,
    JournalEntriesController,
    ProjectsController,
  ],
  providers: [
    AccountingEngineService,
    AccountsService,
    CapitalService,
    CostCentersService,
    FixedAssetsService,
    JournalEntriesService,
    JournalPostingService,
    ProjectsService,
  ],
  exports: [AccountingEngineService, AccountsService, CostCentersService],
})
export class AccountingModule {}
