import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    InvoicesController,
    PaymentsController,
    QuotationsController,
  ],
  providers: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
  ],
})
export class SalesModule {}
