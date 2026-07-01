import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { DatabaseModule } from '../database/database.module';
import { TaxGroupsService } from './tax-groups.service';
import { TaxGroupsController } from './tax-groups.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    WarehousesController,
    ProductsController,
    InventoryController,
    TaxGroupsController,
  ],
  providers: [
    WarehousesService,
    ProductsService,
    InventoryService,
    TaxGroupsService,
  ],
  exports: [
    WarehousesService,
    ProductsService,
    InventoryService,
  ],
})
export class InventoryModule {}
