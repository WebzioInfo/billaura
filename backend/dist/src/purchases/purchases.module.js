"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchasesModule = void 0;
const common_1 = require("@nestjs/common");
const purchases_service_1 = require("./purchases.service");
const purchases_controller_1 = require("./purchases.controller");
const purchase_payments_service_1 = require("./purchase-payments.service");
const purchase_payments_controller_1 = require("./purchase-payments.controller");
const vendors_controller_1 = require("./vendors.controller");
const database_module_1 = require("../database/database.module");
let PurchasesModule = class PurchasesModule {
};
exports.PurchasesModule = PurchasesModule;
exports.PurchasesModule = PurchasesModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [
            purchases_controller_1.PurchasesController,
            purchase_payments_controller_1.PurchasePaymentsController,
            vendors_controller_1.VendorsController,
        ],
        providers: [
            purchases_service_1.PurchasesService,
            purchase_payments_service_1.PurchasePaymentsService,
        ],
        exports: [
            purchases_service_1.PurchasesService,
            purchase_payments_service_1.PurchasePaymentsService,
        ],
    })
], PurchasesModule);
//# sourceMappingURL=purchases.module.js.map