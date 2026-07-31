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
import { GenerateSalarySlipDto, GenerateBulkPayrollDto, PaySalarySlipDto, UpdateSalarySlipDto } from "./dto/payroll.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // --- EMPLOYEES ---
  @Get("employees")
  async findEmployees(@Query('query') query?: string) {
    return this.hrService.findEmployees(query);
  }

  @Get("employees/:id")
  async getEmployeeById(@Param("id") id: string) {
    return this.hrService.getEmployeeById(id);
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

  @Get('employees/:id/attendance-analytics')
  async getEmployeeAttendanceAnalytics(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.hrService.getEmployeeAttendanceAnalytics(id, parsedYear, parsedMonth);
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
  async generatePayroll(@Body() dto: GenerateBulkPayrollDto) {
    return this.hrService.generatePayroll(dto);
  }

  @Put('salary-slips/:id')
  async updateSalarySlip(@Param('id') id: string, @Body() dto: UpdateSalarySlipDto) {
    return this.hrService.updateSalarySlip(id, dto);
  }

  @Post('salary-slips/:id/lock')
  async lockSalarySlip(@Param('id') id: string) {
    return this.hrService.lockSalarySlip(id);
  }

  @Post('salary-slips/:id/pay')
  async paySalarySlip(@Param('id') id: string, @Body() dto: PaySalarySlipDto) {
    return this.hrService.paySalarySlip(id, dto);
  }

  @Post('salary-slips/:id/approve')
  async approveSalarySlip(@Param('id') id: string) {
    return this.hrService.approveSalarySlip(id);
  }

  @Delete('salary-slips/:id')
  async deleteSalarySlip(@Param('id') id: string) {
    return this.hrService.deleteSalarySlip(id);
  }

  @Post('salary-slips/:id/void')
  async voidSalarySlip(@Param('id') id: string, @Body('reason') reason: string) {
    return this.hrService.voidSalarySlip(id, reason);
  }

  @Get('reports/attendance')
  async getAttendanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.hrService.getAttendanceReport(startDate, endDate, departmentId, employeeId);
  }
}
