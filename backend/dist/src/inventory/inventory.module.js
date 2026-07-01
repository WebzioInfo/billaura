"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryModule = void 0;
const common_1 = require("@nestjs/common");
const warehouses_service_1 = require("./warehouses.service");
const warehouses_controller_1 = require("./warehouses.controller");
const products_service_1 = require("./products.service");
const products_controller_1 = require("./products.controller");
const inventory_service_1 = require("./inventory.service");
const inventory_controller_1 = require("./inventory.controller");
const database_module_1 = require("../database/database.module");
const tax_groups_service_1 = require("./tax-groups.service");
const tax_groups_controller_1 = require("./tax-groups.controller");
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [
            warehouses_controller_1.WarehousesController,
            products_controller_1.ProductsController,
            inventory_controller_1.InventoryController,
            tax_groups_controller_1.TaxGroupsController,
        ],
        providers: [
            warehouses_service_1.WarehousesService,
            products_service_1.ProductsService,
            inventory_service_1.InventoryService,
            tax_groups_service_1.TaxGroupsService,
        ],
        exports: [
            warehouses_service_1.WarehousesService,
            products_service_1.ProductsService,
            inventory_service_1.InventoryService,
        ],
    })
], InventoryModule);
//# sourceMappingURL=inventory.module.js.map