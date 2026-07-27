import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDepartmentDto } from './dto/create-customer-department.dto';
import { UpdateCustomerDepartmentDto } from './dto/update-customer-department.dto';

const DEFAULT_DEPARTMENTS = [
  { name: 'Admissions', customerType: 'B2B', sortOrder: 1 },
  { name: 'Administration', customerType: 'B2B', sortOrder: 2 },
  { name: 'Accounts', customerType: 'B2B', sortOrder: 3 },
  { name: 'Laboratory', customerType: 'B2B', sortOrder: 4 },
  { name: 'Production', customerType: 'B2B', sortOrder: 5 },
  { name: 'Quality Control', customerType: 'B2B', sortOrder: 6 },
  { name: 'Sales', customerType: 'B2B', sortOrder: 7 },
  { name: 'Purchase', customerType: 'B2B', sortOrder: 8 },
  { name: 'IT', customerType: 'B2B', sortOrder: 9 },
  { name: 'HR', customerType: 'B2B', sortOrder: 10 },
  { name: 'General', customerType: 'BOTH', sortOrder: 99 }
];

@Injectable()
export class CustomerDepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultDepartments(companyId: string, userId: string) {
    const existing = await this.prisma.customerDepartment.count({
      where: { companyId }
    });

    if (existing === 0) {
      const departmentsToCreate = DEFAULT_DEPARTMENTS.map(d => ({
        ...d,
        companyId,
        createdBy: userId,
        isActive: true
      }));

      await this.prisma.customerDepartment.createMany({
        data: departmentsToCreate,
        skipDuplicates: true
      });
    }
  }

  async findAll(companyId: string, userId: string) {
    await this.seedDefaultDepartments(companyId, userId);

    return this.prisma.customerDepartment.findMany({
      where: { companyId,  },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  async findOne(id: string, companyId: string) {
    const department = await this.prisma.customerDepartment.findUnique({
      where: { id }
    });

    if (!department || department.companyId !== companyId) {
      throw new NotFoundException('Customer department not found');
    }

    return department;
  }

  async create(companyId: string, userId: string, data: CreateCustomerDepartmentDto) {
    const existing = await this.prisma.customerDepartment.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: data.name
        }
      }
    });

    if (existing) {
      throw new ConflictException('Department with this name already exists');
    }

    return this.prisma.customerDepartment.create({
      data: {
        ...data,
        companyId,
        createdBy: userId
      }
    });
  }

  async update(id: string, companyId: string, data: UpdateCustomerDepartmentDto) {
    await this.findOne(id, companyId); 

    if (data.name) {
      const existing = await this.prisma.customerDepartment.findFirst({
        where: {
          companyId,
          name: data.name,
          id: { not: id }
        }
      });
      if (existing) {
        throw new ConflictException('Department with this name already exists');
      }
    }

    return this.prisma.customerDepartment.update({
      where: { id },
      data
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId); 

    const inUse = await this.prisma.businessPartner.findFirst({
      where: { customerDepartmentId: id, companyId }
    });

    if (inUse) {
      throw new ConflictException('Cannot delete department that is currently assigned to customers');
    }

    return this.prisma.customerDepartment.update({
      where: { id },
      data: {  }
    });
  }
}
