import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
} from "@nestjs/common";
import { HrService } from "./hr.service";
import { CreateEmployeeDto } from "./dto/employee.dto";
import { RecordAttendanceDto, BulkRecordAttendanceDto } from "./dto/attendance.dto";
import { GenerateSalarySlipDto, PaySalarySlipDto } from "./dto/payroll.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // --- EMPLOYEES ---
  @Get("employees")
  async findEmployees() {
    return this.hrService.findEmployees();
  }

  @Post("employees")
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(dto);
  }

  @Put("employees/:id")
  async updateEmployee(@Param("id") id: string, @Body() dto: CreateEmployeeDto) {
    return this.hrService.updateEmployee(id, dto);
  }

  @Delete("employees/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEmployee(@Param("id") id: string) {
    await this.hrService.removeEmployee(id);
  }

  @Get("attendances/sheet")
  async getAttendanceSheet(
    @Query('date') date?: string,
    @Query('departmentId') departmentId?: string,
    @Query('designationId') designationId?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ) {
    return this.hrService.getAttendanceSheet({
      date,
      departmentId,
      designationId,
      branchId,
      search,
    });
  }

  @Get("attendances")
  async findAttendances(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('designationId') designationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.hrService.findAttendances({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      employeeId,
      departmentId,
      designationId,
      startDate,
      endDate,
      status,
      search,
    });
  }

  @Post("attendances")
  async recordAttendance(@Body() dto: RecordAttendanceDto) {
    return this.hrService.recordAttendance(dto);
  }

  @Post("attendances/bulk")
  async bulkRecordAttendance(@Body() dto: any) {
    return this.hrService.bulkRecordAttendance(dto);
  }

  @Post("attendances/status")
  async updateAttendanceStatus(@Body() dto: { date: string; status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED' }) {
    return this.hrService.updateAttendanceStatus(dto);
  }

  @Post("attendances/correction")
  async requestAttendanceCorrection(@Body() dto: { attendanceId: string; employeeId: string; reason: string; requestedBy: string }) {
    return this.hrService.requestAttendanceCorrection(dto);
  }

  @Get('salary-slips')
  async getSalarySlips(
    @Query('departmentId') departmentId?: string,
    @Query('designationId') designationId?: string,
    @Query('branchId') branchId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('employmentTypeId') employmentTypeId?: string,
  ) {
    return this.hrService.getSalarySlips({
      departmentId,
      designationId,
      branchId,
      shiftId,
      employmentTypeId,
    });
  }

  @Post('salary-slips/generate')
  async generatePayroll(@Body() dto: { month: number; year: number; departmentId?: string; branchId?: string }) {
    return this.hrService.generatePayroll(dto);
  }

  @Post('salary-slips/:id/pay')
  async paySalarySlip(@Param('id') id: string, @Body() dto: PaySalarySlipDto) {
    return this.hrService.paySalarySlip(id, dto);
  }
}
