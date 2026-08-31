import { Module } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { InvoicesController } from "./invoices.controller";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { QuotationsService } from "./quotations.service";
import { QuotationsController } from "./quotations.controller";
import { SalesReturnsService } from "./sales-returns.service";
import { SalesReturnsController } from "./sales-returns.controller";
import { DatabaseModule } from "../database/database.module";
import { ReceiptsService } from "./receipts.service";
import { ReceiptsController } from "./receipts.controller";
import { SalesOrdersController } from "./sales-orders.controller";
import { SalesOrdersService } from "./sales-orders.service";
import { DeliveryNotesController } from "./delivery-notes.controller";
import { DeliveryNotesService } from "./delivery-notes.service";
import { RecurringInvoicesController } from "./recurring-invoices.controller";
import { RecurringInvoicesService } from "./recurring-invoices.service";
import { PurchasesModule } from "../purchases/purchases.module";
import { ExpensesModule } from "../expenses/expenses.module";
import { AccountingModule } from "../accounting/accounting.module";
import { SharedModule } from "../shared/shared.module";
import { CommissionsModule } from "../commissions/commissions.module";

import { PdfEngineService } from "./pdf-engine.service";

@Module({
  imports: [
    DatabaseModule,
    PurchasesModule,
    ExpensesModule,
    AccountingModule,
    SharedModule,
    CommissionsModule,
  ],
  controllers: [
    InvoicesController,
    PaymentsController,
    QuotationsController,
    SalesReturnsController,
    ReceiptsController,
    SalesOrdersController,
    DeliveryNotesController,
    RecurringInvoicesController,
  ],
  providers: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
    SalesReturnsService,
    ReceiptsService,
    SalesOrdersService,
    DeliveryNotesService,
    RecurringInvoicesService,
    PdfEngineService,
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
    ReceiptsService,
    SalesOrdersService,
    SalesOrdersService,
    DeliveryNotesService,
    RecurringInvoicesService,
  ],
})
export class SalesModule {}
