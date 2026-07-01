import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEmployeeDto } from './dto/employee.dto';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

// Removed Departments & Designations

  async findEmployees() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }
    return this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
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
        department: dto.department || null,
        designation: dto.designation || null,
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
