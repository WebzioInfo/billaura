import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CompanyContext } from "../common/context/company-context";
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  UpdateDesignationDto,
  CreateShiftDto,
  CreateEmploymentTypeDto,
  CreateLeaveTypeDto,
  CreateSalaryComponentDto,
  CreateHolidayCalendarDto,
} from "./dto/masters.dto";

@Injectable()
export class HrMastersService {
  constructor(private readonly prisma: PrismaService) {}

  private getCompanyId(): string {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException("Company context is required");
    }
    return companyId;
  }

  // --- SEED DEFAULTS ---
  async seedDefaults() {
    const companyId = this.getCompanyId();

    // 1. Seed Shifts
    const shiftCount = await this.prisma.shift.count({ where: { companyId } });
    if (shiftCount === 0) {
      const defaultShifts = [
        { name: "Morning", startTime: "09:00", endTime: "17:00", graceTime: 15 },
        { name: "Evening", startTime: "17:00", endTime: "01:00", graceTime: 15 },
        { name: "Night", startTime: "01:00", endTime: "09:00", graceTime: 15 },
        { name: "General", startTime: "09:30", endTime: "18:30", graceTime: 15 },
        { name: "Flexible", startTime: "00:00", endTime: "23:59", graceTime: 0 },
      ];
      for (const s of defaultShifts) {
        await this.prisma.shift.create({
          data: { companyId, name: s.name, startTime: s.startTime, endTime: s.endTime, graceTime: s.graceTime },
        });
      }
    }

    // 2. Seed Departments
    const deptCount = await this.prisma.department.count({ where: { companyId, deletedAt: null } });
    let adminDeptId = "";
    if (deptCount === 0) {
      const defaultDepts = [
        { code: "ADM", name: "Administration" },
        { code: "FIN", name: "Finance" },
        { code: "ACC", name: "Accounts" },
        { code: "SAL", name: "Sales" },
        { code: "MKT", name: "Marketing" },
        { code: "HRM", name: "Human Resources" },
        { code: "PROD", name: "Production" },
        { code: "QC", name: "Quality Control" },
        { code: "MAIN", name: "Maintenance" },
        { code: "PUR", name: "Purchase" },
        { code: "STR", name: "Stores" },
        { code: "WH", name: "Warehouse" },
        { code: "DISP", name: "Dispatch" },
        { code: "WTLB", name: "Water Lab" },
        { code: "MCLB", name: "Microbiology Lab" },
        { code: "ELEC", name: "Electrical" },
        { code: "MECH", name: "Mechanical" },
        { code: "CIV", name: "Civil" },
        { code: "IT", name: "IT" },
        { code: "SEC", name: "Security" },
        { code: "CS", name: "Customer Support" },
        { code: "RD", name: "R&D" },
      ];
      for (const d of defaultDepts) {
        const created = await this.prisma.department.create({
          data: { companyId, code: d.code, name: d.name, description: `${d.name} Department` },
        });
        if (d.code === "ADM") adminDeptId = created.id;
      }
    } else {
      const adminDept = await this.prisma.department.findFirst({ where: { companyId, code: "ADM", deletedAt: null } });
      if (adminDept) adminDeptId = adminDept.id;
    }

    // 3. Seed Designations
    const desCount = await this.prisma.designation.count({ where: { companyId, deletedAt: null } });
    if (desCount === 0 && adminDeptId) {
      const defaultDesgs = [
        { code: "MD", name: "Managing Director" },
        { code: "GM", name: "General Manager" },
        { code: "HRM", name: "HR Manager" },
        { code: "FINM", name: "Finance Manager" },
        { code: "SALM", name: "Sales Manager" },
        { code: "PURM", name: "Purchase Manager" },
        { code: "SUP", name: "Supervisor" },
        { code: "OPR", name: "Operator" },
        { code: "QCE", name: "QC Executive" },
        { code: "LBT", name: "Lab Technician" },
        { code: "ACCT", name: "Accountant" },
        { code: "RCP", name: "Receptionist" },
        { code: "SK", name: "Store Keeper" },
        { code: "ELEC", name: "Electrician" },
        { code: "DRV", name: "Driver" },
        { code: "SO", name: "Security Officer" },
        { code: "HLP", name: "Helper" },
        { code: "CLN", name: "Cleaner" },
      ];
      for (const ds of defaultDesgs) {
        await this.prisma.designation.create({
          data: { companyId, code: ds.code, name: ds.name, departmentId: adminDeptId, level: "L1", description: `${ds.name} Designation` },
        });
      }
    }

    // 4. Seed EmploymentTypes
    const empTypeCount = await this.prisma.employmentType.count({ where: { companyId, deletedAt: null } });
    if (empTypeCount === 0) {
      const defaultEmpTypes = [
        { code: "PERM", name: "Permanent" },
        { code: "CONT", name: "Contract" },
        { code: "PROB", name: "Probation" },
        { code: "INTN", name: "Intern" },
        { code: "CONS", name: "Consultant" },
        { code: "TEMP", name: "Temporary" },
      ];
      for (const et of defaultEmpTypes) {
        await this.prisma.employmentType.create({
          data: { companyId, code: et.code, name: et.name, description: `${et.name} Employment Type` },
        });
      }
    }

    // 5. Seed LeaveTypes
    const leaveCount = await this.prisma.leaveType.count({ where: { companyId, deletedAt: null } });
    if (leaveCount === 0) {
      const defaultLeaves = [
        { code: "CL", name: "Casual Leave" },
        { code: "SL", name: "Sick Leave" },
        { code: "EL", name: "Earned Leave" },
        { code: "MATL", name: "Maternity" },
        { code: "PATL", name: "Paternity" },
        { code: "CO", name: "Comp Off" },
        { code: "LOP", name: "LOP" },
      ];
      for (const lt of defaultLeaves) {
        await this.prisma.leaveType.create({
          data: { companyId, code: lt.code, name: lt.name, description: `${lt.name} Leave` },
        });
      }
    }

    // 6. Seed SalaryComponents
    const compCount = await this.prisma.salaryComponent.count({ where: { companyId, deletedAt: null } });
    if (compCount === 0) {
      const defaultComps = [
        { code: "BASIC", name: "Basic", type: "EARNING" },
        { code: "HRA", name: "HRA", type: "EARNING" },
        { code: "DA", name: "DA", type: "EARNING" },
        { code: "BONUS", name: "Bonus", type: "EARNING" },
        { code: "PF", name: "PF", type: "DEDUCTION" },
        { code: "ESI", name: "ESI", type: "DEDUCTION" },
        { code: "PT", name: "Professional Tax", type: "DEDUCTION" },
        { code: "LOAN", name: "Loan Deduction", type: "DEDUCTION" },
        { code: "OT", name: "Overtime", type: "EARNING" },
        { code: "INC", name: "Incentive", type: "EARNING" },
        { code: "SPL", name: "Special Allowance", type: "EARNING" },
      ];
      for (const sc of defaultComps) {
        await this.prisma.salaryComponent.create({
          data: { companyId, code: sc.code, name: sc.name, type: sc.type, description: `${sc.name} Component` },
        });
      }
    }
  }

  // --- DEPARTMENT CRUD ---
  async getDepartments(query: string = "", includeDeleted = false) {
    const companyId = this.getCompanyId();
    await this.seedDefaults(); // Proactive auto-seed
    return this.prisma.department.findMany({
      where: {
        companyId,
        deletedAt: includeDeleted ? undefined : null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        manager: true,
        costCenter: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const companyId = this.getCompanyId();
    const existing = await this.prisma.department.findFirst({
      where: { companyId, code: dto.code, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Department code ${dto.code} already exists`);

    return this.prisma.department.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        costCenterId: dto.costCenterId || null,
        managerId: dto.managerId || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateDepartment(id: string, dto: CreateDepartmentDto) {
    const companyId = this.getCompanyId();
    const dept = await this.prisma.department.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!dept) throw new NotFoundException("Department not found");

    return this.prisma.department.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        costCenterId: dto.costCenterId || null,
        managerId: dto.managerId || null,
        isActive: dto.isActive ?? dept.isActive,
      },
    });
  }

  async deleteDepartment(id: string) {
    const companyId = this.getCompanyId();
    const dept = await this.prisma.department.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!dept) throw new NotFoundException("Department not found");

    const deps = await this.checkDependencies("departments", id);
    if (deps.hasDependencies) {
      throw new ConflictException({
        message: `Cannot delete Department in use. ${deps.message}`,
        dependencies: deps
      });
    }

    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- DESIGNATION CRUD ---
  async getDesignations(query: string = "", includeDeleted = false, departmentId?: string) {
    const companyId = this.getCompanyId();
    await this.seedDefaults();
    return this.prisma.designation.findMany({
      where: {
        companyId,
        deletedAt: includeDeleted ? undefined : null,
        ...(departmentId ? { departmentId } : {}),
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { department: true },
      orderBy: { name: "asc" },
    });
  }

  async createDesignation(dto: CreateDesignationDto) {
    const companyId = this.getCompanyId();
    const existing = await this.prisma.designation.findFirst({
      where: { companyId, code: dto.code, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Designation code ${dto.code} already exists`);

    return this.prisma.designation.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        departmentId: dto.departmentId,
        level: dto.level || null,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateDesignation(id: string, dto: UpdateDesignationDto) {
    const companyId = this.getCompanyId();
    const desg = await this.prisma.designation.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!desg) throw new NotFoundException("Designation not found");

    return this.prisma.designation.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        departmentId: dto.departmentId,
        level: dto.level || null,
        description: dto.description || null,
        isActive: dto.isActive ?? desg.isActive,
      },
    });
  }

  async deleteDesignation(id: string) {
    const companyId = this.getCompanyId();
    const desg = await this.prisma.designation.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!desg) throw new NotFoundException("Designation not found");

    const deps = await this.checkDependencies("designations", id);
    if (deps.hasDependencies) {
      throw new ConflictException({
        message: `Cannot delete Designation in use. ${deps.message}`,
        dependencies: deps
      });
    }

    return this.prisma.designation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- SHIFTS CRUD ---
  async getShifts() {
    const companyId = this.getCompanyId();
    await this.seedDefaults();
    return this.prisma.shift.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }

  async createShift(dto: CreateShiftDto) {
    const companyId = this.getCompanyId();
    return this.prisma.shift.create({
      data: {
        companyId,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        graceTime: dto.graceTime ?? 15,
      },
    });
  }

  async updateShift(id: string, dto: CreateShiftDto) {
    const companyId = this.getCompanyId();
    const shift = await this.prisma.shift.findFirst({ where: { id, companyId } });
    if (!shift) throw new NotFoundException("Shift not found");

    return this.prisma.shift.update({
      where: { id },
      data: {
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        graceTime: dto.graceTime ?? shift.graceTime,
      },
    });
  }

  async deleteShift(id: string) {
    const companyId = this.getCompanyId();
    const shift = await this.prisma.shift.findFirst({ where: { id, companyId } });
    if (!shift) throw new NotFoundException("Shift not found");

    const deps = await this.checkDependencies("shifts", id);
    if (deps.hasDependencies) {
      throw new ConflictException({
        message: `Cannot delete Shift in use. ${deps.message}`,
        dependencies: deps
      });
    }

    return this.prisma.shift.delete({ where: { id } });
  }

  // --- EMPLOYMENT TYPES CRUD ---
  async getEmploymentTypes(includeDeleted = false) {
    const companyId = this.getCompanyId();
    await this.seedDefaults();
    return this.prisma.employmentType.findMany({
      where: { companyId, deletedAt: includeDeleted ? undefined : null },
      orderBy: { name: "asc" },
    });
  }

  async createEmploymentType(dto: CreateEmploymentTypeDto) {
    const companyId = this.getCompanyId();
    const existing = await this.prisma.employmentType.findFirst({
      where: { companyId, code: dto.code, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Employment Type code ${dto.code} already exists`);

    return this.prisma.employmentType.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateEmploymentType(id: string, dto: CreateEmploymentTypeDto) {
    const companyId = this.getCompanyId();
    const type = await this.prisma.employmentType.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!type) throw new NotFoundException("Employment Type not found");

    return this.prisma.employmentType.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        isActive: dto.isActive ?? type.isActive,
      },
    });
  }

  async deleteEmploymentType(id: string) {
    const companyId = this.getCompanyId();
    const type = await this.prisma.employmentType.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!type) throw new NotFoundException("Employment Type not found");

    const deps = await this.checkDependencies("employment-types", id);
    if (deps.hasDependencies) {
      throw new ConflictException({
        message: `Cannot delete Employment Type in use. ${deps.message}`,
        dependencies: deps
      });
    }

    return this.prisma.employmentType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- LEAVE TYPES CRUD ---
  async getLeaveTypes(includeDeleted = false) {
    const companyId = this.getCompanyId();
    await this.seedDefaults();
    return this.prisma.leaveType.findMany({
      where: { companyId, deletedAt: includeDeleted ? undefined : null },
      orderBy: { name: "asc" },
    });
  }

  async createLeaveType(dto: CreateLeaveTypeDto) {
    const companyId = this.getCompanyId();
    const existing = await this.prisma.leaveType.findFirst({
      where: { companyId, code: dto.code, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Leave Type code ${dto.code} already exists`);

    return this.prisma.leaveType.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateLeaveType(id: string, dto: CreateLeaveTypeDto) {
    const companyId = this.getCompanyId();
    const type = await this.prisma.leaveType.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!type) throw new NotFoundException("Leave Type not found");

    return this.prisma.leaveType.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        isActive: dto.isActive ?? type.isActive,
      },
    });
  }

  async deleteLeaveType(id: string) {
    const companyId = this.getCompanyId();
    const type = await this.prisma.leaveType.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!type) throw new NotFoundException("Leave Type not found");

    return this.prisma.leaveType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- SALARY COMPONENTS CRUD ---
  async getSalaryComponents(includeDeleted = false) {
    const companyId = this.getCompanyId();
    await this.seedDefaults();
    return this.prisma.salaryComponent.findMany({
      where: { companyId, deletedAt: includeDeleted ? undefined : null },
      orderBy: { name: "asc" },
    });
  }

  async createSalaryComponent(dto: CreateSalaryComponentDto) {
    const companyId = this.getCompanyId();
    const existing = await this.prisma.salaryComponent.findFirst({
      where: { companyId, code: dto.code, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Salary Component code ${dto.code} already exists`);

    return this.prisma.salaryComponent.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateSalaryComponent(id: string, dto: CreateSalaryComponentDto) {
    const companyId = this.getCompanyId();
    const comp = await this.prisma.salaryComponent.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!comp) throw new NotFoundException("Salary Component not found");

    return this.prisma.salaryComponent.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        description: dto.description || null,
        isActive: dto.isActive ?? comp.isActive,
      },
    });
  }

  async deleteSalaryComponent(id: string) {
    const companyId = this.getCompanyId();
    const comp = await this.prisma.salaryComponent.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!comp) throw new NotFoundException("Salary Component not found");

    return this.prisma.salaryComponent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- HOLIDAY CALENDAR CRUD ---
  async getHolidayCalendars(includeDeleted = false) {
    const companyId = this.getCompanyId();
    return this.prisma.holidayCalendar.findMany({
      where: { companyId, deletedAt: includeDeleted ? undefined : null },
      orderBy: { date: "asc" },
    });
  }

  async createHolidayCalendar(dto: CreateHolidayCalendarDto) {
    const companyId = this.getCompanyId();
    const parsedDate = new Date(dto.date);
    const existing = await this.prisma.holidayCalendar.findFirst({
      where: { companyId, name: dto.name, date: parsedDate, deletedAt: null },
    });
    if (existing) throw new ConflictException("Holiday calendar entry with this name and date already exists");

    return this.prisma.holidayCalendar.create({
      data: {
        companyId,
        name: dto.name,
        date: parsedDate,
        isRecurring: dto.isRecurring ?? false,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateHolidayCalendar(id: string, dto: CreateHolidayCalendarDto) {
    const companyId = this.getCompanyId();
    const hol = await this.prisma.holidayCalendar.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!hol) throw new NotFoundException("Holiday not found");

    return this.prisma.holidayCalendar.update({
      where: { id },
      data: {
        name: dto.name,
        date: new Date(dto.date),
        isRecurring: dto.isRecurring ?? hol.isRecurring,
        description: dto.description || null,
        isActive: dto.isActive ?? hol.isActive,
      },
    });
  }

  async deleteHolidayCalendar(id: string) {
    const companyId = this.getCompanyId();
    const hol = await this.prisma.holidayCalendar.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!hol) throw new NotFoundException("Holiday not found");

    return this.prisma.holidayCalendar.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async checkDependencies(type: string, id: string) {
    const _companyId = this.getCompanyId();
    let count = 0;
    let message = "";

    if (type === 'departments') {
      const [employees, designations] = await Promise.all([
        this.prisma.employee.count({ where: { departmentId: id, deletedAt: null } }),
        this.prisma.designation.count({ where: { departmentId: id, deletedAt: null } }),
      ]);
      count = employees + designations;
      if (count > 0) {
        message = `This department is currently assigned to ${employees} Employee(s) and ${designations} Designation(s).`;
      }
    } else if (type === 'designations') {
      const employees = await this.prisma.employee.count({ where: { designationId: id, deletedAt: null } });
      count = employees;
      if (count > 0) {
        message = `This designation is currently assigned to ${employees} Employee(s).`;
      }
    } else if (type === 'shifts') {
      const employees = await this.prisma.employee.count({ where: { shiftId: id, deletedAt: null } });
      count = employees;
      if (count > 0) {
        message = `This shift is currently assigned to ${employees} Employee(s).`;
      }
    } else if (type === 'employment-types') {
      const employees = await this.prisma.employee.count({ where: { employmentTypeId: id, deletedAt: null } });
      count = employees;
      if (count > 0) {
        message = `This employment type is currently assigned to ${employees} Employee(s).`;
      }
    }

    return {
      count,
      message,
      hasDependencies: count > 0
    };
  }

  async restore(type: string, id: string) {
    const companyId = this.getCompanyId();
    if (type === 'departments') {
      return this.prisma.department.update({ where: { id, companyId }, data: { deletedAt: null } });
    } else if (type === 'designations') {
      return this.prisma.designation.update({ where: { id, companyId }, data: { deletedAt: null } });
    } else if (type === 'employment-types') {
      return this.prisma.employmentType.update({ where: { id, companyId }, data: { deletedAt: null } });
    } else if (type === 'leave-types') {
      return this.prisma.leaveType.update({ where: { id, companyId }, data: { deletedAt: null } });
    } else if (type === 'salary-components') {
      return this.prisma.salaryComponent.update({ where: { id, companyId }, data: { deletedAt: null } });
    } else if (type === 'holidays') {
      return this.prisma.holidayCalendar.update({ where: { id, companyId }, data: { deletedAt: null } });
    }
    throw new ConflictException(`Restore not supported for type: ${type}`);
  }
}
