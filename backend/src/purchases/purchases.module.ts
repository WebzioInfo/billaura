import { Module } from "@nestjs/common";
import { PurchasesService } from "./purchases.service";
import { PurchasesController } from "./purchases.controller";
import { PurchasePaymentsService } from "./purchase-payments.service";
import { PurchasePaymentsController } from "./purchase-payments.controller";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";
import { DatabaseModule } from "../database/database.module";
import { PurchaseOrdersController } from "./purchase-orders.controller";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { GoodsReceiptsController } from "./goods-receipts.controller";
import { GoodsReceiptsService } from "./goods-receipts.service";

import { AccountingModule } from "../accounting/accounting.module";
import { SharedModule } from "../shared/shared.module";

import { PurchasesDocumentController } from "./purchases-document.controller";
import { PurchasesDocumentService } from "./purchases-document.service";
import { TesseractBillExtractor } from "./ocr/providers/tesseract-bill-extractor";
import { BillMatcherService } from "./ocr/bill-matcher.service";

@Module({
  imports: [DatabaseModule, AccountingModule, SharedModule],
  controllers: [
    PurchasesController,
    PurchasesDocumentController,
    PurchasePaymentsController,
    VendorsController,
    PurchaseOrdersController,
    GoodsReceiptsController,
  ],
  providers: [
    PurchasesService,
    PurchasesDocumentService,
    TesseractBillExtractor,
    BillMatcherService,
    PurchasePaymentsService,
    PurchaseOrdersService,
    GoodsReceiptsService,
    VendorsService,
  ],
  exports: [
    PurchasesService,
    PurchasesDocumentService,
    TesseractBillExtractor,
    BillMatcherService,
    PurchasePaymentsService,
    PurchaseOrdersService,
    GoodsReceiptsService,
    VendorsService,
  ],
})
export class PurchasesModule {}
