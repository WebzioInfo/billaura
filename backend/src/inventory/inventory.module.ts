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
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    WarehousesController,
    ProductsController,
    InventoryController,
    TaxGroupsController,
    CategoriesController,
    BrandsController,
    UnitsController,
  ],
  providers: [
    WarehousesService,
    ProductsService,
    InventoryService,
    TaxGroupsService,
    CategoriesService,
    BrandsService,
    UnitsService,
  ],
  exports: [
    WarehousesService,
    ProductsService,
    InventoryService,
    CategoriesService,
    BrandsService,
    UnitsService,
  ],
})
export class InventoryModule {}
