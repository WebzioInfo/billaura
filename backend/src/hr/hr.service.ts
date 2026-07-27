import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEmployeeDto } from './dto/employee.dto';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { GenerateSalarySlipDto, PaySalarySlipDto } from './dto/payroll.dto';
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
      include: {
        department: true,
        designation: true,
        shift: true,
        employmentType: true,
        reportingManager: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createEmployee(dto: CreateEmployeeDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const existing = await this.prisma.employee.findFirst({
      where: { companyId, employeeCode: dto.employeeCode },
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
        shiftId: dto.shiftId || null,
        employmentTypeId: dto.employmentTypeId || null,
        reportingManagerId: dto.reportingManagerId || null,
        basicSalary: dto.basicSalary || 0,
        salaryType: 'MONTHLY',
        allowances: dto.allowances || null,
        bankDetails: dto.bankDetails || null,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        status: dto.status || 'ACTIVE',
      },
    });
  }

  async updateEmployee(id: string, dto: CreateEmployeeDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null }
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (dto.employeeCode !== employee.employeeCode) {
      const codeExists = await this.prisma.employee.findFirst({
        where: { companyId, employeeCode: dto.employeeCode, NOT: { id } },
      });
      if (codeExists) {
        throw new ConflictException(`Employee code '${dto.employeeCode}' already exists`);
      }
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        employeeCode: dto.employeeCode,
        name: dto.name,
        mobile: dto.mobile || null,
        email: dto.email || null,
        departmentId: dto.departmentId || null,
        designationId: dto.designationId || null,
        shiftId: dto.shiftId || null,
        employmentTypeId: dto.employmentTypeId || null,
        reportingManagerId: dto.reportingManagerId || null,
        basicSalary: dto.basicSalary || 0,
        allowances: dto.allowances || null,
        bankDetails: dto.bankDetails || null,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        status: dto.status || undefined,
      },
    });
  }

  async removeEmployee(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId }
    });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- ATTENDANCES ---

  async findAttendances(filters: any = {}) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const where: any = { companyId };
    
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }
    if (filters.status) where.type = filters.status;
    
    if (filters.departmentId || filters.designationId || filters.search) {
      where.employee = {};
      if (filters.departmentId) where.employee.departmentId = filters.departmentId;
      if (filters.designationId) where.employee.designationId = filters.designationId;
      if (filters.search) {
        where.employee.user = {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } }
          ]
        };
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: { 
          employee: {
            include: {

              department: true,
              designation: true,
              shift: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendance.count({ where })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async recordAttendance(dto: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
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
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        workingHours: dto.workingHours,
        breakTime: dto.breakTime,
        overtime: dto.overtime,
        lateBy: dto.lateBy,
        earlyExit: dto.earlyExit,
      },
      create: {
        companyId,
        employeeId: dto.employeeId,
        date: dateVal,
        type: dto.type,
        notes: dto.notes || null,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
        workingHours: dto.workingHours,
        breakTime: dto.breakTime,
        overtime: dto.overtime,
        lateBy: dto.lateBy,
        earlyExit: dto.earlyExit,
      },
    });
  }

  async bulkRecordAttendance(dto: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const results = [];
    for (const record of dto.records) {
      try {
        const res = await this.recordAttendance(record);
        results.push({ success: true, employeeId: record.employeeId, data: res });
      } catch (err: any) {
        results.push({ success: false, employeeId: record.employeeId, error: err.message });
      }
    }
    return results;
  }

  // --- PAYROLL ---

  async getSalarySlips(filters?: {
    departmentId?: string;
    designationId?: string;
    branchId?: string;
    shiftId?: string;
    employmentTypeId?: string;
  }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const where: any = { companyId };
    
    if (filters) {
      const employeeFilter: any = {};
      if (filters.departmentId) employeeFilter.departmentId = filters.departmentId;
      if (filters.designationId) employeeFilter.designationId = filters.designationId;
      if (filters.branchId) employeeFilter.branchId = filters.branchId;
      if (filters.shiftId) employeeFilter.shiftId = filters.shiftId;
      if (filters.employmentTypeId) employeeFilter.employmentTypeId = filters.employmentTypeId;

      if (Object.keys(employeeFilter).length > 0) {
        where.employee = employeeFilter;
      }
    }

    return this.prisma.salarySlip.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            designation: true,
            
            shift: true,
            employmentType: true,
          }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async generateSalarySlip(dto: GenerateSalarySlipDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const basicSalary = Number(employee.basicSalary);
    let allowancesAmount = 0;
    
    // Sum allowances if any
    const allowancesArr = employee.allowances as any[];
    if (allowancesArr && Array.isArray(allowancesArr)) {
      allowancesAmount = allowancesArr.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    }

    const bonus = dto.bonus || 0;
    const deductions = dto.deductions || 0;
    
    // Net Salary = Basic + Allowances + Bonus - Deductions
    const netSalary = basicSalary + allowancesAmount + bonus - deductions;

    return this.prisma.salarySlip.create({
      data: {
        companyId,
        employeeId: employee.id,
        month: dto.month,
        year: dto.year,
        basicSalary,
        allowances: allowancesAmount,
        bonus,
        deductions,
        netSalary,
        status: 'GENERATED',
      },
    });
  }

  async paySalarySlip(id: string, dto: PaySalarySlipDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const slip = await this.prisma.salarySlip.findFirst({
      where: { id, companyId },
      include: { employee: true },
    });

    if (!slip) throw new NotFoundException('Salary slip not found');
    if (slip.status === 'PAID') throw new ConflictException('Salary slip is already paid');

    return this.prisma.$transaction(async (tx) => {
      const netSalary = Number(slip.netSalary);

      // Fetch or Create Payroll Expense Account
      let payrollAccount = await tx.account.findFirst({
        where: { companyId, name: 'Payroll Expense' },
      });
      if (!payrollAccount) {
        payrollAccount = await tx.account.create({
          data: { companyId, name: 'Payroll Expense', category: 'EXPENSE', balance: 0 },
        });
      }

      // Fetch Bank Account
      const bankAccount = await tx.bankAccount.findUnique({
        where: { id: dto.bankAccountId },
      });
      if (!bankAccount) throw new NotFoundException('Bank account not found');

      // Fetch or Create Bank General Ledger Account
      let bankGlAccount = await tx.account.findFirst({
        where: { companyId, name: bankAccount.name },
      });
      if (!bankGlAccount) {
        bankGlAccount = await tx.account.create({
          data: { companyId, name: bankAccount.name, category: 'ASSET', balance: 0 },
        });
      }

      // Post Journal Entry (Debit Payroll Expense, Credit Bank)
      await tx.journalEntry.create({
        data: {
          companyId,
          date: new Date(),
          reference: `SAL-${slip.year}-${slip.month}-${slip.employee.employeeCode}`,
          description: `Salary Payment for ${slip.employee.name} (${slip.month}/${slip.year})`,
          lines: {
            create: [
              { accountId: payrollAccount.id, debit: netSalary, credit: 0, departmentId: slip.employee.departmentId || null },
              { accountId: bankGlAccount.id, debit: 0, credit: netSalary, departmentId: slip.employee.departmentId || null },
            ],
          },
        },
      });

      // Update Ledger Balances
      await tx.account.update({
        where: { id: payrollAccount.id },
        data: { balance: { increment: netSalary } },
      });
      await tx.account.update({
        where: { id: bankGlAccount.id },
        data: { balance: { decrement: netSalary } }, // Asset credit -> balance decreases
      });

      // Decrement operating Bank Account
      await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: { currentBalance: { decrement: netSalary } },
      });

      // Mark as Paid
      return tx.salarySlip.update({
        where: { id },
        data: { status: 'PAID' },
      });
    });
  }
}
