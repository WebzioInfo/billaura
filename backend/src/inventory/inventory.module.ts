import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { DatabaseModule } from '../database/database.module';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { TaxGroupsService } from './tax-groups.service';
import { TaxGroupsController } from './tax-groups.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CategoriesController,
    BrandsController,
    WarehousesController,
    ProductsController,
    InventoryController,
    UnitsController,
    TaxGroupsController,
  ],
  providers: [
    CategoriesService,
    BrandsService,
    WarehousesService,
    ProductsService,
    InventoryService,
    UnitsService,
    TaxGroupsService,
  ],
  exports: [
    CategoriesService,
    BrandsService,
    WarehousesService,
    ProductsService,
    InventoryService,
  ],
})
export class InventoryModule {}
