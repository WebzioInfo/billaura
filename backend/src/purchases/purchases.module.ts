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

@Module({
  imports: [DatabaseModule, AccountingModule, SharedModule],
  controllers: [
    PurchasesController,
    PurchasePaymentsController,
    VendorsController,
    PurchaseOrdersController,
    GoodsReceiptsController,
  ],
  providers: [
    PurchasesService,
    PurchasePaymentsService,
    PurchaseOrdersService,
    GoodsReceiptsService,
    VendorsService,
  ],
  exports: [
    PurchasesService,
    PurchasePaymentsService,
    PurchaseOrdersService,
    GoodsReceiptsService,
    VendorsService,
  ],
})
export class PurchasesModule {}
