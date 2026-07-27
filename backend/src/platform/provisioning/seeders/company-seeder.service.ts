import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus, BusinessType } from '@prisma/client';
import { CreateTenantDto } from '../dto/create-tenant.dto';

@Injectable()
export class CompanySeederService {
  async seedCompanyAndDefaults(tx: Prisma.TransactionClient, dto: CreateTenantDto) {
    // Determine business type
    let bType: BusinessType = BusinessType.TRADING;
    if (dto.businessType) {
       bType = (dto.businessType as any) as BusinessType;
    }

    // Step 1 & 2: Create Company
    const company = await tx.company.create({
      data: {
        tenantCode: dto.tenantCode,
        companyName: dto.companyName,
        legalName: dto.legalName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        country: dto.country,
        state: dto.state,
        pinCode: dto.postalCode,
        currency: dto.currency || 'INR',
        logo: dto.logo,
        status: (dto.status as any) || SubscriptionStatus.ACTIVE,
        businessType: bType,
      }
    });

    // Step 3: Create Head Office Branch
    const branch = await tx.branch.create({
      data: {
        companyId: company.id,
        name: 'Head Office',
        code: 'HO',
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        isDefault: true,
      }
    });

    // Step 4: Create Default Warehouse
    const warehouse = await tx.warehouse.create({
      data: {
        companyId: company.id,
        name: 'Main Warehouse',
        isDefault: true,
      }
    });

    // Step 5: Create Financial Year
    const yearStart = dto.financialYearStart ? new Date(dto.financialYearStart) : new Date(new Date().getFullYear(), 3, 1);
    const yearEnd = new Date(yearStart.getFullYear() + 1, 2, 31, 23, 59, 59);
    const fyName = `${yearStart.getFullYear()}-${yearEnd.getFullYear()}`;

    const financialYear = await tx.financialYear.create({
      data: {
        companyId: company.id,
        name: fyName,
        startDate: yearStart,
        endDate: yearEnd,
        isActive: true,
      }
    });

    return { company, branch, warehouse, financialYear };
  }
}
