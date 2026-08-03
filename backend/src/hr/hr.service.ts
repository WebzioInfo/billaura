import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEmployeeDto } from './dto/employee.dto';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { AttendanceEngine } from './attendance-engine';
import { PayrollEngine } from './payroll-engine';
import { GenerateSalarySlipDto, PaySalarySlipDto, UpdateSalarySlipDto } from './dto/payroll.dto';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

// Removed Departments & Designations

  async findEmployees(query?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const where: any = { companyId, deletedAt: null };
    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q } },
        { employeeCode: { contains: q } },
        { email: { contains: q } },
        { mobile: { contains: q } },
        { panNumber: { contains: q } },
        { aadhaarNumber: { contains: q } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
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

  async getEmployeeById(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        department: true,
        designation: true,
        branch: true,
        shift: true,
        employmentType: true,
        reportingManager: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 30
        },
        salaryRevisions: {
          orderBy: { effectiveDate: 'desc' },
          include: {
            components: {
              include: { component: true }
            }
          }
        },
        salarySlips: {
          orderBy: { startDate: 'desc' },
          take: 12
        },
        leaveApplications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        advances: true,
        loans: true
      }
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
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

    // Detect Holiday or Weekly Off
    let holidayInfo: { isHoliday: boolean; type?: 'PUBLIC_HOLIDAY' | 'WEEKLY_OFF'; name?: string } = { isHoliday: false };
    
    // Check Weekly Off (Default Sunday = 0)
    const companySettings = await this.prisma.companySettings.findUnique({
      where: { companyId },
      select: { hrSettings: true }
    });
    const hrSettings = (companySettings?.hrSettings as any) || {};
    const weeklyOffDays: number[] = hrSettings.weeklyOffDays ?? [0]; // default Sunday
    
    if (weeklyOffDays.includes(targetDate.getDay())) {
      holidayInfo = { isHoliday: true, type: 'WEEKLY_OFF', name: 'Weekly Off' };
    }

    // Check Company Holiday Calendar
    if (!holidayInfo.isHoliday) {
      const holiday = await this.prisma.holidayCalendar.findFirst({
        where: {
          companyId,
          isActive: true,
          deletedAt: null,
          date: targetDate
        }
      });
      if (holiday) {
        holidayInfo = { isHoliday: true, type: 'PUBLIC_HOLIDAY', name: holiday.name };
      }
    }

    return { sheet, holidayInfo };
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
  async getEmployeeAttendanceAnalytics(employeeId: string, year: number, month: number) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    // 1. Fetch Yearly Attendances & Company Holiday Master
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    
    const [yearlyAttendancesData, companyHolidays] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          companyId,
          employeeId,
          date: { gte: yearStart, lte: yearEnd }
        },
        orderBy: { date: 'asc' }
      }),
      this.prisma.holidayCalendar.findMany({
        where: {
          companyId,
          deletedAt: null,
          isActive: true,
          date: { gte: yearStart, lte: yearEnd }
        }
      })
    ]);

    const holidayMap = new Map<string, string>();
    companyHolidays.forEach(h => {
      const dateStr = h.date.toISOString().split('T')[0];
      holidayMap.set(dateStr, h.name);
    });

    const attendanceMap = new Map<string, any>();
    yearlyAttendancesData.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      attendanceMap.set(dateStr, a);
    });

    // Generate complete calendar entries for the requested month
    const daysInMonth = new Date(year, month, 0).getDate();
    const calendarRecords: any[] = [];

    // Convert DB attendances to standard format
    const dbAttendanceList = yearlyAttendancesData.map(a => {
      let lateMinutes = 0;
      let overtimeMinutes = 0;
      let workingMinutes = 0;

      if (a.checkIn && a.checkOut) {
        const ci = new Date(a.checkIn);
        const co = new Date(a.checkOut);
        workingMinutes = Math.floor((co.getTime() - ci.getTime()) / 60000);

        const shiftStart = new Date(ci);
        shiftStart.setHours(9, 0, 0, 0);
        if (ci > shiftStart) {
          lateMinutes = Math.floor((ci.getTime() - shiftStart.getTime()) / 60000);
        }
        if (workingMinutes > 480) {
          overtimeMinutes = workingMinutes - 480;
        }
      }

      return {
        id: a.id,
        date: a.date.toISOString().split('T')[0],
        status: a.type,
        checkIn: a.checkIn?.toISOString() || null,
        checkOut: a.checkOut?.toISOString() || null,
        workingMinutes,
        lateMinutes,
        overtimeMinutes,
        remarks: a.notes,
        isDatabaseRecord: true
      };
    });

    // Merge exact holiday calendar dates
    const holidayList = companyHolidays
      .filter(h => !attendanceMap.has(h.date.toISOString().split('T')[0]))
      .map(h => ({
        date: h.date.toISOString().split('T')[0],
        status: 'HOLIDAY',
        remarks: h.name,
        workingMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        isDatabaseRecord: true
      }));

    const attendances = [...dbAttendanceList, ...holidayList];

    // 3. Compute Monthly KPI Summaries via AttendanceEngine
    const monthlyAttendances = attendances.filter(a => {
      const [y, m] = a.date.split('-');
      return parseInt(y, 10) === year && parseInt(m, 10) === month;
    });

    const metrics = AttendanceEngine.computeMetrics(
      monthlyAttendances.map(a => ({
        employeeId,
        date: a.date,
        type: a.status,
        workingMinutes: a.workingMinutes,
        overtimeMinutes: a.overtimeMinutes,
        lateMinutes: a.lateMinutes
      })),
      daysInMonth
    );

    return {
      summary: {
        present: metrics.present,
        absent: metrics.absent,
        halfDay: metrics.halfDay,
        leave: metrics.leave,
        holiday: metrics.holiday,
        weeklyOff: metrics.weekOff,
        lateCount: metrics.lateCount,
        totalWorkingHours: metrics.totalWorkingHours,
        totalOvertimeHours: +(metrics.totalOvertimeMinutes / 60).toFixed(1),
        attendancePercentage: metrics.attendancePercentage,
        totalPaidDays: metrics.totalPaidDays,
        lossOfPayDays: metrics.lossOfPayDays
      },
      attendances
    };
  }

  async getEmployeeAttendanceCalendar(employeeId: string, startDateStr: string, endDateStr: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException('Company context is required');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { department: true, designation: true, shift: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
    });

    let leaves: any[] = [];
    try {
      if ((this.prisma as any).leaveRequest) {
        leaves = await (this.prisma as any).leaveRequest.findMany({
          where: {
            companyId,
            employeeId,
            status: 'APPROVED',
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        });
      }
    } catch (e) {}

    let holidays: any[] = [];
    try {
      if ((this.prisma as any).holiday) {
        holidays = await (this.prisma as any).holiday.findMany({
          where: {
            companyId,
            date: { gte: startDate, lte: endDate },
          },
        });
      }
    } catch (e) {}

    return AttendanceEngine.generateEmployeeCalendar({
      employee,
      startDate,
      endDate,
      attendances,
      leaves,
      holidays,
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

    if (!dto.records || dto.records.length === 0) {
      return { success: true, message: "No changes detected.", recordsProcessed: 0 };
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
      orderBy: [{ startDate: 'desc' }],
    });
  }

  async generatePayroll(dto: { startDate: string | Date; endDate: string | Date; departmentId?: string; branchId?: string }) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const employeeWhere: any = { companyId, deletedAt: null, status: 'ACTIVE' };
    if (dto.departmentId) employeeWhere.departmentId = dto.departmentId;
    if (dto.branchId) employeeWhere.branchId = dto.branchId;

    const employees = await this.prisma.employee.findMany({ 
      where: employeeWhere,
      include: {
        salaryRevisions: {
          where: { status: 'ACTIVE' },
          include: {
            components: {
              include: { component: true }
            }
          }
        }
      }
    });
    if (!employees.length) throw new NotFoundException('No active employees found for the given filters');

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    
    // Calculate days between start and end (inclusive)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const daysInMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

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
      
      // 1. Generate Attendance Insights via AttendanceEngine
      const attResult = AttendanceEngine.generateEmployeeCalendar({
        employee: emp,
        startDate,
        endDate,
        attendances: empAtt,
      });

      // 2. Compute Payroll via PayrollEngine
      const activeRevision = emp.salaryRevisions?.[0];
      const basicSalary = activeRevision ? Number(activeRevision.basicSalary) : (Number(emp.basicSalary) || 0);

      const calcResult = PayrollEngine.calculatePayroll({
        employee: {
          id: emp.id,
          name: emp.name,
          joiningDate: emp.joiningDate,
          relievingDate: (emp as any).relievingDate,
          basicSalary,
          allowances: Number((emp as any).allowances) || 0,
          bonus: Number((emp as any).bonus) || 0,
          incentives: Number((emp as any).incentives) || 0,
          pfNumber: (emp as any).pfNumber || null,
          esiNumber: (emp as any).esiNumber || null,
          panNumber: (emp as any).panNumber || null,
        },
        period: { startDate, endDate },
        attendanceSummary: attResult.insights,
      });

      const earningsBreakdown = {
        "Earned Basic Salary": { amount: calcResult.earnings.earnedBasic, formula: calcResult.formulaSnapshot.earnedBasicFormula },
        "Earned Allowances": { amount: calcResult.earnings.earnedAllowances, formula: `Prorated for ${calcResult.attendance.paidDays} paid days` },
        "Overtime": { amount: calcResult.earnings.earnedOvertime, formula: `${calcResult.attendance.otHours} hrs @ 1.5x hourly wage` },
        "Bonus": { amount: calcResult.earnings.earnedBonus, formula: "Fixed / Performance Bonus" },
        "Incentives": { amount: calcResult.earnings.earnedIncentives, formula: "Sales / Performance Incentive" },
      };

      const deductionsBreakdown = {
        "PF (Provident Fund)": { amount: calcResult.deductions.pf, formula: "12% of Earned Basic (capped)" },
        "ESI": { amount: calcResult.deductions.esi, formula: "0.75% of Earned Gross" },
        "Income Tax / TDS": { amount: calcResult.deductions.tax, formula: "Standard TDS Deduction" },
        "Fine / LOP": { amount: calcResult.deductions.fine, formula: `${calcResult.attendance.lossOfPayDays} LOP days deduction` },
      };

      const attendanceSummary = {
        present: calcResult.attendance.present,
        absent: calcResult.attendance.absent,
        halfDay: calcResult.attendance.halfDay,
        leave: calcResult.attendance.paidLeave,
        unpaidLeave: calcResult.attendance.unpaidLeave,
        holiday: calcResult.attendance.holiday,
        weeklyOff: calcResult.attendance.weekOff,
        lateCount: calcResult.attendance.lateCount,
        otHours: calcResult.attendance.otHours,
        totalPaidDays: calcResult.attendance.paidDays,
        lossOfPayDays: calcResult.attendance.lossOfPayDays,
        daysInMonth: calcResult.period.daysInMonth,
        formula: calcResult.formulaSnapshot.earnedBasicFormula,
      };

      // Strict Validation: Sum of all states must match totalDays exactly
      const sumOfDays = 
        calcResult.attendance.present +
        calcResult.attendance.absent +
        calcResult.attendance.halfDay +
        calcResult.attendance.paidLeave +
        calcResult.attendance.unpaidLeave +
        calcResult.attendance.holiday +
        calcResult.attendance.weekOff +
        calcResult.attendance.futureDays +
        calcResult.attendance.preJoiningDays +
        calcResult.attendance.postRelievingDays;
      
      if (sumOfDays !== calcResult.attendance.totalDays) {
        throw new BadRequestException(
          `Attendance validation failed for employee ${emp.name}. Calculated days sum (${sumOfDays}) does not match period days (${calcResult.attendance.totalDays}).`
        );
      }

      const slip = await this.prisma.salarySlip.upsert({
        where: {
          employeeId_startDate_endDate: {
            employeeId: emp.id,
            startDate,
            endDate,
          }
        },
        update: {
          basicSalary: calcResult.earnings.earnedBasic,
          allowances: calcResult.earnings.earnedAllowances,
          deductions: calcResult.deductions.totalDeductions,
          netSalary: calcResult.netSalary,
          paidDays: calcResult.attendance.paidDays,
          absentDays: calcResult.attendance.lossOfPayDays,
          earningsBreakdown,
          deductionsBreakdown,
          attendanceSummary,
        },
        create: {
          companyId,
          employeeId: emp.id,
          startDate,
          endDate,
          basicSalary: calcResult.earnings.earnedBasic,
          allowances: calcResult.earnings.earnedAllowances,
          deductions: calcResult.deductions.totalDeductions,
          netSalary: calcResult.netSalary,
          paidDays: calcResult.attendance.paidDays,
          absentDays: calcResult.attendance.lossOfPayDays,
          earningsBreakdown,
          deductionsBreakdown,
          attendanceSummary,
          status: 'DRAFT'
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
          reference: `SAL-${slip.startDate.getFullYear()}-${slip.startDate.getMonth() + 1}-${slip.employee.employeeCode}`,
          description: `Salary Payment for ${slip.employee.name} (${slip.startDate.toLocaleDateString()} - ${slip.endDate.toLocaleDateString()})`,
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

  async approveSalarySlip(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const slip = await this.prisma.salarySlip.findFirst({
      where: { id, companyId },
    });

    if (!slip) throw new NotFoundException('Salary slip not found');
    if (slip.status !== 'GENERATED' && slip.status !== 'DRAFT') {
      throw new ConflictException(`Cannot approve salary slip in ${slip.status} state`);
    }

    return this.prisma.salarySlip.update({
      where: { id },
      data: { 
        status: 'APPROVED',
        auditLogs: {
          create: {
            action: 'APPROVED',
            userId: CompanyContext.getUserId(),
          }
        }
      },
    });
  }

  async getSalarySlipById(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const slip = await this.prisma.salarySlip.findFirst({
      where: { id, companyId },
      include: {
        employee: {
          include: {
            department: true,
            designation: true,
            branch: true,
            shift: true,
            employmentType: true,
          }
        },
        auditLogs: {
          include: {
            user: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!slip) throw new NotFoundException('Salary slip not found');
    return slip;
  }

  async updateSalarySlip(id: string, dto: UpdateSalarySlipDto) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const slip = await this.prisma.salarySlip.findFirst({
      where: { id, companyId },
      include: {
        auditLogs: true
      }
    });

    if (!slip) throw new NotFoundException('Salary slip not found');
    if (slip.status === 'LOCKED' || slip.status === 'PAID') {
      throw new ConflictException(`Salary slip in ${slip.status} status is locked and cannot be directly modified`);
    }

    const oldSnapshot = {
      basicSalary: Number(slip.basicSalary),
      allowances: Number(slip.allowances),
      bonus: Number(slip.bonus),
      incentives: Number(slip.incentives),
      advances: Number(slip.advances),
      deductions: Number(slip.deductions),
      netSalary: Number(slip.netSalary),
      earningsBreakdown: slip.earningsBreakdown,
      deductionsBreakdown: slip.deductionsBreakdown,
      status: slip.status,
    };

    const basicSalary = dto.basicSalary !== undefined ? dto.basicSalary : Number(slip.basicSalary);
    const allowances = dto.allowances !== undefined ? dto.allowances : Number(slip.allowances);
    const bonus = dto.bonus !== undefined ? dto.bonus : Number(slip.bonus);
    const incentives = dto.incentives !== undefined ? dto.incentives : Number(slip.incentives);
    const otAmount = dto.otAmount !== undefined ? dto.otAmount : 0;

    const fine = dto.fine !== undefined ? dto.fine : 0;
    const advanceRecovery = dto.advanceRecovery !== undefined ? dto.advanceRecovery : (dto.advances !== undefined ? dto.advances : Number(slip.advances));
    const loanRecovery = dto.loanRecovery !== undefined ? dto.loanRecovery : 0;
    const pf = dto.pf !== undefined ? dto.pf : 0;
    const esi = dto.esi !== undefined ? dto.esi : 0;
    const tax = dto.tax !== undefined ? dto.tax : 0;
    const otherDeductions = dto.otherDeductions !== undefined ? dto.otherDeductions : 0;

    const calculatedDeductions = dto.deductions !== undefined 
      ? dto.deductions 
      : (fine + advanceRecovery + loanRecovery + pf + esi + tax + otherDeductions);

    const grossSalary = basicSalary + allowances + bonus + incentives + otAmount;
    const totalDeductions = calculatedDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    const newSnapshot = {
      basicSalary,
      allowances,
      bonus,
      incentives,
      otAmount,
      fine,
      advanceRecovery,
      loanRecovery,
      pf,
      esi,
      tax,
      otherDeductions,
      deductions: totalDeductions,
      grossSalary,
      netSalary,
      status: dto.status || slip.status,
    };

    const auditPayload = {
      userReason: dto.reason || 'Payroll edit and recalculation',
      old: oldSnapshot,
      new: newSnapshot,
      version: (slip.auditLogs?.length || 0) + 1,
    };

    const updatedStatus = (dto.status as any) || slip.status;

    return this.prisma.salarySlip.update({
      where: { id },
      data: {
        basicSalary,
        allowances,
        bonus,
        incentives,
        advances: advanceRecovery,
        deductions: totalDeductions,
        netSalary,
        status: updatedStatus,
        paidDays: dto.paidDays !== undefined ? dto.paidDays : slip.paidDays,
        absentDays: dto.absentDays !== undefined ? dto.absentDays : slip.absentDays,
        earningsBreakdown: dto.earningsBreakdown || {
          "Basic Salary": { amount: basicSalary },
          "Allowances": { amount: allowances },
          "Bonus": { amount: bonus },
          "Incentives": { amount: incentives },
          "Overtime": { amount: otAmount }
        },
        deductionsBreakdown: dto.deductionsBreakdown || {
          "Fine": { amount: fine },
          "Advance Recovery": { amount: advanceRecovery },
          "Loan Recovery": { amount: loanRecovery },
          "PF": { amount: pf },
          "ESI": { amount: esi },
          "Tax": { amount: tax },
          "Other Deductions": { amount: otherDeductions }
        },
        auditLogs: {
          create: {
            action: updatedStatus === 'DRAFT' ? 'DRAFT_SAVED' : 'REVISED',
            reason: JSON.stringify(auditPayload),
            userId: CompanyContext.getUserId(),
          }
        }
      },
      include: {
        employee: true,
        auditLogs: {
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async lockSalarySlip(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const slip = await this.prisma.salarySlip.findFirst({
      where: { id, companyId },
    });

    if (!slip) throw new NotFoundException('Salary slip not found');

    return this.prisma.salarySlip.update({
      where: { id },
      data: {
        status: 'LOCKED',
        auditLogs: {
          create: {
            action: 'LOCKED',
            reason: 'Locked after final review',
            userId: CompanyContext.getUserId(),
          }
        }
      }
    });
  }

  async deleteSalarySlip(id: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const slip = await this.prisma.salarySlip.findFirst({
      where: { id, companyId },
    });

    if (!slip) throw new NotFoundException('Salary slip not found');
    if (slip.status !== 'DRAFT' && slip.status !== 'GENERATED') {
      throw new ConflictException(`Cannot delete a salary slip in ${slip.status} state. Only DRAFT or GENERATED slips can be deleted.`);
    }

    return this.prisma.salarySlip.delete({
      where: { id },
    });
  }

  async voidSalarySlip(id: string, reason: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const slip = await this.prisma.salarySlip.findFirst({
      where: { id, companyId },
    });

    if (!slip) throw new NotFoundException('Salary slip not found');
    if (slip.status !== 'PAID' && slip.status !== 'LOCKED') {
      throw new ConflictException(`Can only void PAID or LOCKED salary slips. Current state: ${slip.status}`);
    }

    return this.prisma.salarySlip.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        auditLogs: {
          create: {
            action: 'VOIDED',
            reason: reason || 'Voided by Administrator',
            userId: CompanyContext.getUserId(),
          }
        }
      }
    });
  }

  async getAttendanceReport(startDateStr: string, endDateStr: string, departmentId?: string, employeeId?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new ConflictException('Company context is required');

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const employeeWhere: any = { companyId, deletedAt: null };
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (employeeId) employeeWhere.id = employeeId;

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: true,
        designation: true,
        branch: true,
        shift: true,
      }
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate },
        employeeId: { in: employees.map(e => e.id) },
      }
    });

    const dayDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return employees.map(emp => {
      const empAtt = attendances.filter(a => a.employeeId === emp.id);
      const metrics = AttendanceEngine.computeMetrics(
        empAtt.map(a => {
          let workingMinutes = 0;
          let overtimeMinutes = 0;
          let lateMinutes = 0;

          if (a.checkIn && a.checkOut) {
            const ci = new Date(a.checkIn);
            const co = new Date(a.checkOut);
            workingMinutes = Math.floor((co.getTime() - ci.getTime()) / 60000);
            if (workingMinutes > 480) {
              overtimeMinutes = workingMinutes - 480;
            }
            const shiftStart = new Date(ci);
            shiftStart.setHours(9, 0, 0, 0);
            if (ci > shiftStart) {
              lateMinutes = Math.floor((ci.getTime() - shiftStart.getTime()) / 60000);
            }
          }

          return {
            employeeId: emp.id,
            date: a.date,
            type: a.status || a.type,
            workingMinutes,
            overtimeMinutes,
            lateMinutes
          };
        }),
        dayDiff
      );
      
      return {
        employee: emp,
        summary: {
          present: metrics.present,
          absent: metrics.absent,
          halfDay: metrics.halfDay,
          leave: metrics.leave,
          holiday: metrics.holiday,
          weeklyOff: metrics.weekOff,
          overtimeHours: +(metrics.totalOvertimeMinutes / 60).toFixed(1),
          lateCount: metrics.lateCount,
          totalWorkingDays: dayDiff,
          attendancePercentage: metrics.attendancePercentage,
          totalPaidDays: metrics.totalPaidDays,
          lossOfPayDays: metrics.lossOfPayDays,
        },
        dailyTimeline: empAtt.sort((a, b) => a.date.getTime() - b.date.getTime())
      };
    });
  }
}
