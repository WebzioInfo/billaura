import { Module } from '@nestjs/common';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantProvisioningController } from './tenant-provisioning.controller';
import { CompanySeederService } from './seeders/company-seeder.service';
import { MasterDataSeederService } from './seeders/master-data-seeder.service';
import { ChartOfAccountsSeederService } from './seeders/chart-of-accounts-seeder.service';
import { UserProvisioningService } from './seeders/user-provisioning.service';
// Assuming PrismaModule is exported from database module
// import { PrismaModule } from '../../database/prisma.module'; 
// Wait, the project might export PrismaService globally or from a specific module.
// In this project it seems PrismaService is in src/prisma.service.ts, so we'll just provide it directly or assume it's global.
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [TenantProvisioningController],
  providers: [
    PrismaService,
    TenantProvisioningService,
    CompanySeederService,
    MasterDataSeederService,
    ChartOfAccountsSeederService,
    UserProvisioningService,
  ],
  exports: [TenantProvisioningService],
})
export class TenantProvisioningModule {}
