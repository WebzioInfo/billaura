import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AccountsController,
    JournalEntriesController,
  ],
  providers: [
    AccountsService,
    JournalEntriesService,
  ],
  exports: [
    AccountsService,
    JournalEntriesService,
  ],
})
export class AccountingModule {}
