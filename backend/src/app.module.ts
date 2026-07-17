import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { MailModule } from "./mail/mail.module";
import { ReportsModule } from "./reports/reports.module";
import { IncomeModule } from "./income/income.module";
import { BackupModule } from "./backup/backup.module";
import { ScheduleModule } from "@nestjs/schedule";
import { StorageModule } from "./storage/storage.module";
import { PrismaTestController } from "./prisma-test.controller";
import { FinanceModule } from "./finance/finance.module";
import { UsersModule } from "./users/users.module";

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { DocumentTemplatesModule } from "./settings/document-templates/document-templates.module";
import { CommissionsModule } from './commissions/commissions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute globally
    }]),
    CacheModule.register({ isGlobal: true, ttl: 60000 }), // 60 seconds global cache
    MailModule,
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
    ReportsModule,
    IncomeModule,
    BackupModule,
    StorageModule,
    ScheduleModule.forRoot(),
    FinanceModule,
    UsersModule,
    DocumentTemplatesModule,
    CommissionsModule,
    AuditLogsModule,
  ],
  controllers: [PrismaTestController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}
