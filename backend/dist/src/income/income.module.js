"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeModule = void 0;
const common_1 = require("@nestjs/common");
const income_categories_controller_1 = require("./income-categories.controller");
const income_categories_service_1 = require("./income-categories.service");
const other_incomes_controller_1 = require("./other-incomes.controller");
const other_incomes_service_1 = require("./other-incomes.service");
let IncomeModule = class IncomeModule {
};
exports.IncomeModule = IncomeModule;
exports.IncomeModule = IncomeModule = __decorate([
    (0, common_1.Module)({
        controllers: [income_categories_controller_1.IncomeCategoriesController, other_incomes_controller_1.OtherIncomesController],
        providers: [income_categories_service_1.IncomeCategoriesService, other_incomes_service_1.OtherIncomesService],
        exports: [income_categories_service_1.IncomeCategoriesService, other_incomes_service_1.OtherIncomesService],
    })
], IncomeModule);
//# sourceMappingURL=income.module.js.map