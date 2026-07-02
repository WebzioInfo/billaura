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
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    InvoicesController,
    PaymentsController,
    QuotationsController,
    SalesReturnsController,
    ReceiptsController,
  ],
  providers: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
    SalesReturnsService,
    ReceiptsService,
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
    ReceiptsService,
  ],
})
export class SalesModule {}
