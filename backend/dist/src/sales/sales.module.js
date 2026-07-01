"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesModule = void 0;
const common_1 = require("@nestjs/common");
const invoices_service_1 = require("./invoices.service");
const invoices_controller_1 = require("./invoices.controller");
const payments_service_1 = require("./payments.service");
const payments_controller_1 = require("./payments.controller");
const quotations_service_1 = require("./quotations.service");
const quotations_controller_1 = require("./quotations.controller");
const sales_returns_service_1 = require("./sales-returns.service");
const sales_returns_controller_1 = require("./sales-returns.controller");
const database_module_1 = require("../database/database.module");
let SalesModule = class SalesModule {
};
exports.SalesModule = SalesModule;
exports.SalesModule = SalesModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [
            invoices_controller_1.InvoicesController,
            payments_controller_1.PaymentsController,
            quotations_controller_1.QuotationsController,
            sales_returns_controller_1.SalesReturnsController,
        ],
        providers: [
            invoices_service_1.InvoicesService,
            payments_service_1.PaymentsService,
            quotations_service_1.QuotationsService,
            sales_returns_service_1.SalesReturnsService,
        ],
        exports: [
            invoices_service_1.InvoicesService,
            payments_service_1.PaymentsService,
            quotations_service_1.QuotationsService,
        ],
    })
], SalesModule);
//# sourceMappingURL=sales.module.js.map