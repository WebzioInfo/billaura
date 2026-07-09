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

    // Verify employee belongs to company
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

  // --- PAYROLL ---

  async getSalarySlips() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');
    return this.prisma.salarySlip.findMany({
      where: { companyId },
      include: { employee: true },
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
              { accountId: payrollAccount.id, debit: netSalary, credit: 0 },
              { accountId: bankGlAccount.id, debit: 0, credit: netSalary },
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
