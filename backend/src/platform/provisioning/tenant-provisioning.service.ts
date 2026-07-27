import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CompanySeederService } from './seeders/company-seeder.service';
import { MasterDataSeederService } from './seeders/master-data-seeder.service';
import { UserProvisioningService } from './seeders/user-provisioning.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantProvisioningService {
  constructor(
    private prisma: PrismaService,
    private companySeeder: CompanySeederService,
    private masterDataSeeder: MasterDataSeederService,
    private userProvisioning: UserProvisioningService,
  ) {}

  async provisionTenant(dto: CreateTenantDto, superAdminId: string) {
    // Basic pre-transaction checks
    const existingTenant = await this.prisma.company.findUnique({
      where: { tenantCode: dto.tenantCode }
    });
    if (existingTenant) {
      throw new BadRequestException('Tenant Code already exists.');
    }

    // Execute everything in a single, robust transaction
    // Interactive transaction with increased timeout since we are seeding a lot of data
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 1-5: Company, Branch, Warehouse, Financial Year
      const { company } = await this.companySeeder.seedCompanyAndDefaults(tx, dto);

      // Step 6-10: Seed Master Data (COA, Inventory, Bank, HR, CRM, Settings)
      await this.masterDataSeeder.seedMasterData(tx, company.id);

      // Step 11-15: Seed Roles, Create Company Admin, Assign Roles
      await this.userProvisioning.provisionCompanyAdmin(tx, company.id, dto);

      // Step 16: Generate Audit Log
      await tx.auditLog.create({
        data: {
          companyId: company.id,
          userId: superAdminId,
          action: 'TENANT_PROVISIONED',
          tableName: 'Company',
          newValues: { tenantCode: dto.tenantCode, companyName: dto.companyName }
        }
      });

      return company;
    }, {
      maxWait: 10000, // 10s wait to acquire lock
      timeout: 30000, // 30s timeout for the entire transaction
    });

    // Step 17: Send Welcome Email (future integration)
    // this.mailService.sendWelcomeEmail(dto.adminEmail, ...);

    return result;
  }
}
