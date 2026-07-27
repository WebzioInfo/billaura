import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { HrMastersService } from "./hr-masters.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateShiftDto,
  CreateEmploymentTypeDto,
  CreateLeaveTypeDto,
  CreateSalaryComponentDto,
  CreateHolidayCalendarDto,
} from "./dto/masters.dto";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("hr-masters")
export class HrMastersController {
  constructor(private readonly mastersService: HrMastersService) {}

  // --- SEED ---
  @Post("seed")
  @HttpCode(HttpStatus.OK)
  async seedDefaults() {
    await this.mastersService.seedDefaults();
    return { message: "Defaults seeded successfully" };
  }

  // --- DEPARTMENTS ---
  @Get("departments")
  async getDepartments(@Query("query") query?: string, @Query("includeDeleted") includeDeleted?: string) {
    return this.mastersService.getDepartments(query || "", includeDeleted === "true");
  }

  @Post("departments")
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.mastersService.createDepartment(dto);
  }

  @Put("departments/:id")
  async updateDepartment(@Param("id") id: string, @Body() dto: CreateDepartmentDto) {
    return this.mastersService.updateDepartment(id, dto);
  }

  @Delete("departments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDepartment(@Param("id") id: string) {
    await this.mastersService.deleteDepartment(id);
  }

  // --- DESIGNATIONS ---
  @Get("designations")
  async getDesignations(
    @Query("query") query?: string, 
    @Query("includeDeleted") includeDeleted?: string,
    @Query("departmentId") departmentId?: string
  ) {
    return this.mastersService.getDesignations(query || "", includeDeleted === "true", departmentId);
  }

  @Post("designations")
  async createDesignation(@Body() dto: CreateDesignationDto) {
    return this.mastersService.createDesignation(dto);
  }

  @Put("designations/:id")
  async updateDesignation(@Param("id") id: string, @Body() dto: CreateDesignationDto) {
    return this.mastersService.updateDesignation(id, dto);
  }

  @Delete("designations/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDesignation(@Param("id") id: string) {
    await this.mastersService.deleteDesignation(id);
  }

  // --- SHIFTS ---
  @Get("shifts")
  async getShifts() {
    return this.mastersService.getShifts();
  }

  @Post("shifts")
  async createShift(@Body() dto: CreateShiftDto) {
    return this.mastersService.createShift(dto);
  }

  @Put("shifts/:id")
  async updateShift(@Param("id") id: string, @Body() dto: CreateShiftDto) {
    return this.mastersService.updateShift(id, dto);
  }

  @Delete("shifts/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShift(@Param("id") id: string) {
    await this.mastersService.deleteShift(id);
  }

  // --- EMPLOYMENT TYPES ---
  @Get("employment-types")
  async getEmploymentTypes(@Query("includeDeleted") includeDeleted?: string) {
    return this.mastersService.getEmploymentTypes(includeDeleted === "true");
  }

  @Post("employment-types")
  async createEmploymentType(@Body() dto: CreateEmploymentTypeDto) {
    return this.mastersService.createEmploymentType(dto);
  }

  @Put("employment-types/:id")
  async updateEmploymentType(@Param("id") id: string, @Body() dto: CreateEmploymentTypeDto) {
    return this.mastersService.updateEmploymentType(id, dto);
  }

  @Delete("employment-types/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmploymentType(@Param("id") id: string) {
    await this.mastersService.deleteEmploymentType(id);
  }

  // --- LEAVE TYPES ---
  @Get("leave-types")
  async getLeaveTypes(@Query("includeDeleted") includeDeleted?: string) {
    return this.mastersService.getLeaveTypes(includeDeleted === "true");
  }

  @Post("leave-types")
  async createLeaveType(@Body() dto: CreateLeaveTypeDto) {
    return this.mastersService.createLeaveType(dto);
  }

  @Put("leave-types/:id")
  async updateLeaveType(@Param("id") id: string, @Body() dto: CreateLeaveTypeDto) {
    return this.mastersService.updateLeaveType(id, dto);
  }

  @Delete("leave-types/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLeaveType(@Param("id") id: string) {
    await this.mastersService.deleteLeaveType(id);
  }

  // --- SALARY COMPONENTS ---
  @Get("salary-components")
  async getSalaryComponents(@Query("includeDeleted") includeDeleted?: string) {
    return this.mastersService.getSalaryComponents(includeDeleted === "true");
  }

  @Post("salary-components")
  async createSalaryComponent(@Body() dto: CreateSalaryComponentDto) {
    return this.mastersService.createSalaryComponent(dto);
  }

  @Put("salary-components/:id")
  async updateSalaryComponent(@Param("id") id: string, @Body() dto: CreateSalaryComponentDto) {
    return this.mastersService.updateSalaryComponent(id, dto);
  }

  @Delete("salary-components/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSalaryComponent(@Param("id") id: string) {
    await this.mastersService.deleteSalaryComponent(id);
  }

  // --- HOLIDAYS ---
  @Get("holidays")
  async getHolidays(@Query("includeDeleted") includeDeleted?: string) {
    return this.mastersService.getHolidayCalendars(includeDeleted === "true");
  }

  @Post("holidays")
  async createHoliday(@Body() dto: CreateHolidayCalendarDto) {
    return this.mastersService.createHolidayCalendar(dto);
  }

  @Put("holidays/:id")
  async updateHoliday(@Param("id") id: string, @Body() dto: CreateHolidayCalendarDto) {
    return this.mastersService.updateHolidayCalendar(id, dto);
  }

  @Delete("holidays/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHoliday(@Param("id") id: string) {
    await this.mastersService.deleteHolidayCalendar(id);
  }

  // --- MASTER UTILITIES ---
  @Get(":type/:id/dependencies")
  async checkDependencies(@Param("type") type: string, @Param("id") id: string) {
    return this.mastersService.checkDependencies(type, id);
  }

  @Post(":type/:id/restore")
  async restore(@Param("type") type: string, @Param("id") id: string) {
    return this.mastersService.restore(type, id);
  }
}
