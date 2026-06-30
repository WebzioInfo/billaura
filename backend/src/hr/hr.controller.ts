import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { HrService } from './hr.service';
import { CreateDepartmentDto } from './dto/department.dto';
import { CreateDesignationDto } from './dto/designation.dto';
import { CreateEmployeeDto } from './dto/employee.dto';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // --- DEPARTMENTS ---
  @Get('departments')
  async findDepartments() {
    return this.hrService.findDepartments();
  }

  @Post('departments')
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.hrService.createDepartment(dto);
  }

  @Delete('departments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDepartment(@Param('id') id: string) {
    await this.hrService.removeDepartment(id);
  }

  // --- DESIGNATIONS ---
  @Get('designations')
  async findDesignations() {
    return this.hrService.findDesignations();
  }

  @Post('designations')
  async createDesignation(@Body() dto: CreateDesignationDto) {
    return this.hrService.createDesignation(dto);
  }

  @Delete('designations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDesignation(@Param('id') id: string) {
    await this.hrService.removeDesignation(id);
  }

  // --- EMPLOYEES ---
  @Get('employees')
  async findEmployees() {
    return this.hrService.findEmployees();
  }

  @Post('employees')
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(dto);
  }

  @Delete('employees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEmployee(@Param('id') id: string) {
    await this.hrService.removeEmployee(id);
  }

  // --- ATTENDANCES ---
  @Get('attendances')
  async findAttendances() {
    return this.hrService.findAttendances();
  }

  @Post('attendances')
  async recordAttendance(@Body() dto: RecordAttendanceDto) {
    return this.hrService.recordAttendance(dto);
  }
}
