import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDepartmentDto } from './dto/department.dto';
import { CreateDesignationDto } from './dto/designation.dto';
import { CreateEmployeeDto } from './dto/employee.dto';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // --- DEPARTMENTS ---

  async findDepartments() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }
    return this.prisma.department.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const existing = await this.prisma.department.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Department '${dto.name}' already exists`);
    }

    return this.prisma.department.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  async removeDepartment(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    // Check if employees belong to department
    const inUse = await this.prisma.employee.findFirst({
      where: { departmentId: id, deletedAt: null },
    });
    if (inUse) {
      throw new ConflictException('Cannot delete department with active employees');
    }

    return this.prisma.department.deleteMany({
      where: { id, companyId },
    });
  }

  // --- DESIGNATIONS ---

  async findDesignations() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }
    return this.prisma.designation.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createDesignation(dto: CreateDesignationDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const existing = await this.prisma.designation.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Designation '${dto.name}' already exists`);
    }

    return this.prisma.designation.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  async removeDesignation(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const inUse = await this.prisma.employee.findFirst({
      where: { designationId: id, deletedAt: null },
    });
    if (inUse) {
      throw new ConflictException('Cannot delete designation assigned to active employees');
    }

    return this.prisma.designation.deleteMany({
      where: { id, companyId },
    });
  }

  // --- EMPLOYEES ---

  async findEmployees() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }
    return this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      include: { department: true, designation: true },
      orderBy: { name: 'asc' },
    });
  }

  async createEmployee(dto: CreateEmployeeDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const existing = await this.prisma.employee.findFirst({
      where: { companyId, employeeCode: dto.employeeCode, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Employee code '${dto.employeeCode}' already exists`);
    }

    return this.prisma.employee.create({
      data: {
        companyId,
        employeeCode: dto.employeeCode,
        name: dto.name,
        mobile: dto.mobile || null,
        email: dto.email || null,
        departmentId: dto.departmentId || null,
        designationId: dto.designationId || null,
        basicSalary: dto.basicSalary || 0,
        salaryType: 'MONTHLY',
        status: 'ACTIVE',
      },
    });
  }

  async removeEmployee(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- ATTENDANCES ---

  async findAttendances() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }
    return this.prisma.attendance.findMany({
      where: { companyId },
      include: { employee: true },
      orderBy: { date: 'desc' },
    });
  }

  async recordAttendance(dto: RecordAttendanceDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
    }

    const dateVal = new Date(dto.date);
    dateVal.setUTCHours(0, 0, 0, 0);

    return this.prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: dto.employeeId,
          date: dateVal,
        },
      },
      update: {
        type: dto.type,
        notes: dto.notes || null,
      },
      create: {
        companyId,
        employeeId: dto.employeeId,
        date: dateVal,
        type: dto.type,
        notes: dto.notes || null,
      },
    });
  }
}
