import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { PurchasePaymentsService } from './purchase-payments.service';
import { PurchasePaymentsController } from './purchase-payments.controller';
import { VendorsController } from './vendors.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    PurchasesController,
    PurchasePaymentsController,
    VendorsController,
  ],
  providers: [
    PurchasesService,
    PurchasePaymentsService,
  ],
  exports: [
    PurchasesService,
    PurchasePaymentsService,
  ],
})
export class PurchasesModule {}
