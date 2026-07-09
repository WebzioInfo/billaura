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
import { PurchasesModule } from "../purchases/purchases.module";
import { ExpensesModule } from "../expenses/expenses.module";

@Module({
  imports: [DatabaseModule, PurchasesModule, ExpensesModule],
  controllers: [
    InvoicesController,
    PaymentsController,
    QuotationsController,
    SalesReturnsController,
    ReceiptsController,
    SalesOrdersController,
    DeliveryNotesController,
  ],
  providers: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
    SalesReturnsService,
    ReceiptsService,
    SalesOrdersService,
    DeliveryNotesService,
  ],
  exports: [
    InvoicesService,
    PaymentsService,
    QuotationsService,
    ReceiptsService,
    SalesOrdersService,
    DeliveryNotesService,
  ],
})
export class SalesModule {}
