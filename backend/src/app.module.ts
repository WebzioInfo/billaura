import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { AppConfigModule } from "./config/app-config.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { LoggingModule } from "./logging/logging.module";
import { SharedModule } from "./shared/shared.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import { BranchesModule } from "./branches/branches.module";
import { RolesModule } from "./roles/roles.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { CrmModule } from "./crm/crm.module";
import { InventoryModule } from "./inventory/inventory.module";
import { SalesModule } from "./sales/sales.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { AccountingModule } from "./accounting/accounting.module";
import { TaxesModule } from "./taxes/taxes.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { HrModule } from "./hr/hr.module";
import { PlatformModule } from "./platform/platform.module";

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    CommonModule,
    DatabaseModule,
    SharedModule,
    AuditModule,
    AuthModule,
    HealthModule,
    BranchesModule,
    RolesModule,
    DashboardModule,
    CrmModule,
    InventoryModule,
    SalesModule,
    PurchasesModule,
    AccountingModule,
    TaxesModule,
    ExpensesModule,
    HrModule,
    PlatformModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes("*");
  }
}
