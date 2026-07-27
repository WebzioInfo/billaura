import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateTenantDto } from '../dto/create-tenant.dto';

@Injectable()
export class UserProvisioningService {
  async provisionCompanyAdmin(tx: Prisma.TransactionClient, companyId: string, dto: CreateTenantDto) {
    // Check if email already exists
    const existingUser = await tx.user.findUnique({
      where: { email: dto.adminEmail }
    });

    if (existingUser) {
      throw new BadRequestException('Admin email already exists in the system.');
    }

    // Step 11 & 12: Seed Default Role
    const adminRole = await tx.role.create({
      data: {
        companyId,
        name: 'Company Admin',
        description: 'Full access to company resources',
        isSystem: true
      }
    });

    // Step 14: Create Company Administrator
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    
    // We get the first branch to link the employee (assumed Head Office created by CompanySeeder)
    const branch = await tx.branch.findFirst({ where: { companyId, isDefault: true } });

    const user = await tx.user.create({
      data: {
        email: dto.adminEmail,
        name: dto.adminName,
        passwordHash,
        phone: dto.adminMobile,
        globalRole: 'ADMIN',
        emailVerified: true,
      }
    });

    // Step 15: Assign Company Admin Role
    await tx.companyUser.create({
      data: {
        companyId,
        userId: user.id,
        role: 'ADMIN',
        customRoleId: adminRole.id
      }
    });

    // Optional: Create Employee record
    if (branch) {
      const defaultDept = await tx.department.findFirst({ where: { companyId } });
      const defaultDesig = await tx.designation.findFirst({ where: { companyId } });

      await tx.employee.create({
        data: {
          companyId,
          
          employeeCode: 'EMP-001',
          name: dto.adminName,
          email: dto.adminEmail,
          mobile: dto.adminMobile || '',
          departmentId: defaultDept?.id,
          designationId: defaultDesig?.id,
          
          joiningDate: new Date(),
          status: 'ACTIVE'
        }
      });
    }

    return user;
  }
}
