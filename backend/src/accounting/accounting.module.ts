import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { BankAccountsController } from './bank-accounts.controller';
import { CapitalController } from './capital.controller';
import { CapitalService } from './capital.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AccountsController,
    JournalEntriesController,
    BankAccountsController,
    CapitalController,
  ],
  providers: [
    AccountsService,
    JournalEntriesService,
    CapitalService,
  ],
  exports: [
    AccountsService,
    JournalEntriesService,
    CapitalService,
  ],
})
export class AccountingModule {}
