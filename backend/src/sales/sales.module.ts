import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { SalesReturnsService } from './sales-returns.service';
import { SalesReturnsController } from './sales-returns.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    InvoicesController,
    PaymentsController,
    QuotationsController,
    SalesReturnsController,
  ],
  providers: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
    SalesReturnsService,
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
  ],
})
export class SalesModule {}
