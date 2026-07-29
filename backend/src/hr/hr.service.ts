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
      where: { id, companyId },
      include: {
        attendances: { select: { id: true }, take: 1 },
        leaveApplications: { select: { id: true }, take: 1 },
        salarySlips: { select: { id: true }, take: 1 },
        advances: { select: { id: true }, take: 1 },
        loans: { select: { id: true }, take: 1 },
        expenses: { select: { id: true }, take: 1 },
        otherIncomes: { select: { id: true }, take: 1 },
        commissionRecords: { select: { id: true }, take: 1 },
        reportees: { select: { id: true }, take: 1 },
      }
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const linkedModules: string[] = [];
    if (employee.attendances?.length > 0) linkedModules.push('Attendance');
    if (employee.leaveApplications?.length > 0) linkedModules.push('Leave');
    if (employee.salarySlips?.length > 0) linkedModules.push('Salary');
    if (employee.advances?.length > 0) linkedModules.push('Advances');
    if (employee.loans?.length > 0) linkedModules.push('Loans');
    if (employee.expenses?.length > 0) linkedModules.push('Expenses');
    if (employee.otherIncomes?.length > 0) linkedModules.push('Other Income');
    if (employee.commissionRecords?.length > 0) linkedModules.push('Commissions');
    if (employee.reportees?.length > 0) linkedModules.push('Reporting Manager');

    if (linkedModules.length > 0) {
      throw new ConflictException(`Cannot delete employee. Linked records found in: ${linkedModules.join(', ')}.`);
    }

    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- ATTENDANCES ---

  async getAttendanceSheet(filters: any = {}) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const targetDate = filters.date ? new Date(filters.date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const employeeWhere: any = { companyId, deletedAt: null, status: 'ACTIVE' };
    
    if (filters.departmentId) employeeWhere.departmentId = filters.departmentId;
    if (filters.designationId) employeeWhere.designationId = filters.designationId;
    if (filters.branchId) employeeWhere.branchId = filters.branchId;
    
    if (filters.search) {
      employeeWhere.name = { contains: filters.search, mode: 'insensitive' };
    }

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        designation: true,
        shift: true,
      },
      orderBy: { name: 'asc' },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        date: targetDate,
        employeeId: { in: employees.map(e => e.id) },
      }
    });

    const attendanceMap = new Map();
    for (const record of attendances) {
      attendanceMap.set(record.employeeId, record);
    }

    const sheet = employees.map(emp => {
      const record = attendanceMap.get(emp.id);
      return {
        employee: emp,
        attendance: record || {
          id: null,
          employeeId: emp.id,
          date: targetDate,
          type: 'NOT_MARKED',
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          remarks: ''
        }
      };
    });

    return sheet;
  }

  async updateAttendanceStatus(dto: { date: string; status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED' }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const targetDate = new Date(dto.date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const updateData: any = { status: dto.status };
    
    // In a real scenario, you'd get the user ID from the request context
    // For now we'll just set the timestamps
    if (dto.status === 'APPROVED') {
      updateData.approvedAt = new Date();
    } else if (dto.status === 'LOCKED') {
      updateData.lockedAt = new Date();
    }

    const updated = await this.prisma.attendance.updateMany({
      where: {
        companyId,
        date: targetDate,
      },
      data: updateData,
    });

    return { success: true, count: updated.count };
  }

  async requestAttendanceCorrection(dto: { attendanceId: string; employeeId: string; reason: string; requestedBy: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    return this.prisma.attendanceCorrection.create({
      data: {
        attendanceId: dto.attendanceId,
        employeeId: dto.employeeId,
        requestedBy: dto.requestedBy,
        reason: dto.reason,
        status: 'PENDING'
      }
    });
  }
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

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    if (dateVal > today) {
      throw new ConflictException(`Cannot mark attendance for a future date: ${dto.date}`);
    }

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

  async generatePayroll(dto: { month: number; year: number; departmentId?: string; branchId?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const employeeWhere: any = { companyId, deletedAt: null, status: 'ACTIVE' };
    if (dto.departmentId) employeeWhere.departmentId = dto.departmentId;
    if (dto.branchId) employeeWhere.branchId = dto.branchId;

    const employees = await this.prisma.employee.findMany({ where: employeeWhere });
    if (!employees.length) throw new NotFoundException('No active employees found for the given filters');

    const startDate = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const endDate = new Date(Date.UTC(dto.year, dto.month, 0, 23, 59, 59, 999));
    const daysInMonth = endDate.getUTCDate();

    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        employeeId: { in: employees.map(e => e.id) },
      }
    });

    const results = [];
    for (const emp of employees) {
      const empAtt = attendances.filter(a => a.employeeId === emp.id);
      const present = empAtt.filter(a => a.type === 'PRESENT').length;
      const absent = empAtt.filter(a => a.type === 'ABSENT' || a.type === 'UNPAID_LEAVE').length;
      const halfDay = empAtt.filter(a => a.type === 'HALF_DAY').length;
      const leave = empAtt.filter(a => a.type === 'LEAVE' || a.type === 'PAID_LEAVE').length;
      const holiday = empAtt.filter(a => a.type === 'HOLIDAY' || a.type === 'WEEK_OFF').length;
      const remote = empAtt.filter(a => a.type === 'REMOTE' || a.type === 'WORK_FROM_HOME' || a.type === 'TRAINING' || a.type === 'ON_DUTY').length;
      
      const totalPaidDays = present + leave + holiday + remote + (halfDay * 0.5);
      const basic = Number(emp.basicSalary) || 0;
      
      const hra = basic * 0.40;
      const standardAllowance = basic * 0.10;
      const totalAllowances = hra + standardAllowance;
      
      const pf = basic * 0.12;
      const pt = 200;
      // Loss of pay for full absent days + half days
      const lossOfPay = (basic / daysInMonth) * (absent + (halfDay * 0.5));
      const totalDeductions = pf + pt + lossOfPay;
      
      const netSalary = (basic + totalAllowances) - totalDeductions;
      
      const earningsBreakdown = {
        basicPay: basic,
        hra,
        standardAllowance
      };
      
      const deductionsBreakdown = {
        pf,
        professionalTax: pt,
        lossOfPay
      };
      
      const attendanceSummary = {
        present,
        absent,
        halfDay,
        leave,
        holiday,
        remote,
        totalPaidDays,
        daysInMonth
      };

      const slip = await this.prisma.salarySlip.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: dto.month,
            year: dto.year,
          }
        },
        update: {
          basicSalary: basic,
          allowances: totalAllowances,
          deductions: totalDeductions,
          netSalary,
          paidDays: totalPaidDays,
          absentDays: absent,
          earningsBreakdown,
          deductionsBreakdown,
          attendanceSummary,
        },
        create: {
          companyId,
          employeeId: emp.id,
          month: dto.month,
          year: dto.year,
          basicSalary: basic,
          allowances: totalAllowances,
          deductions: totalDeductions,
          netSalary,
          paidDays: totalPaidDays,
          absentDays: absent,
          earningsBreakdown,
          deductionsBreakdown,
          attendanceSummary,
        }
      });
      results.push(slip);
    }

    return { success: true, generated: results.length };
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
