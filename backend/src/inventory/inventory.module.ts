import { Module } from "@nestjs/common";
import { WarehousesService } from "./warehouses.service";
import { WarehousesController } from "./warehouses.controller";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { InventoryService } from "./inventory.service";
import { InventoryController } from "./inventory.controller";
import { DatabaseModule } from "../database/database.module";
import { TaxGroupsService } from "./tax-groups.service";
import { TaxGroupsController } from "./tax-groups.controller";
import { CategoriesService } from "./categories.service";
import { CategoriesController } from "./categories.controller";
import { BrandsService } from "./brands.service";
import { BrandsController } from "./brands.controller";
import { UnitsService } from "./units.service";
import { UnitsController } from "./units.controller";
import { BatchesService } from "./batches.service";
import { BatchesController } from "./batches.controller";
import { SerialsService } from "./serials.service";
import { SerialsController } from "./serials.controller";
import { BomService } from "./bom.service";
import { BomController } from "./bom.controller";

import { DatabaseModule } from "../database/database.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [
    WarehousesController,
    ProductsController,
    InventoryController,
    TaxGroupsController,
    CategoriesController,
    BrandsController,
    UnitsController,
    BatchesController,
    SerialsController,
    BomController,
  ],
  providers: [
    WarehousesService,
    ProductsService,
    InventoryService,
    TaxGroupsService,
    CategoriesService,
    BrandsService,
    UnitsService,
    BatchesService,
    SerialsService,
    BomService,
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
