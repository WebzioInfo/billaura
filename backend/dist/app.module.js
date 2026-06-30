"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const common_module_1 = require("./common/common.module");
const app_config_module_1 = require("./config/app-config.module");
const database_module_1 = require("./database/database.module");
const health_module_1 = require("./health/health.module");
const logging_module_1 = require("./logging/logging.module");
const shared_module_1 = require("./shared/shared.module");
const tenant_context_middleware_1 = require("./common/middleware/tenant-context.middleware");
const branches_module_1 = require("./branches/branches.module");
const roles_module_1 = require("./roles/roles.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const crm_module_1 = require("./crm/crm.module");
const inventory_module_1 = require("./inventory/inventory.module");
const sales_module_1 = require("./sales/sales.module");
const purchases_module_1 = require("./purchases/purchases.module");
const accounting_module_1 = require("./accounting/accounting.module");
const taxes_module_1 = require("./taxes/taxes.module");
const expenses_module_1 = require("./expenses/expenses.module");
const hr_module_1 = require("./hr/hr.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(tenant_context_middleware_1.TenantContextMiddleware)
            .forRoutes("*");
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            app_config_module_1.AppConfigModule,
            logging_module_1.LoggingModule,
            common_module_1.CommonModule,
            database_module_1.DatabaseModule,
            shared_module_1.SharedModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            health_module_1.HealthModule,
            branches_module_1.BranchesModule,
            roles_module_1.RolesModule,
            dashboard_module_1.DashboardModule,
            crm_module_1.CrmModule,
            inventory_module_1.InventoryModule,
            sales_module_1.SalesModule,
            purchases_module_1.PurchasesModule,
            accounting_module_1.AccountingModule,
            taxes_module_1.TaxesModule,
            expenses_module_1.ExpensesModule,
            hr_module_1.HrModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map