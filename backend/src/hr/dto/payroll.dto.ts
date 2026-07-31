import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class GenerateSalarySlipDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(2000)
  year: number;

  @IsNumber()
  @IsOptional()
  bonus?: number;

  @IsNumber()
  @IsOptional()
  deductions?: number;
}

export class GenerateBulkPayrollDto {
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}

export class PaySalarySlipDto {
  @IsString()
  @IsNotEmpty()
  bankAccountId: string;
}

export class UpdateSalarySlipDto {
  @IsNumber()
  @IsOptional()
  basicSalary?: number;

  @IsNumber()
  @IsOptional()
  allowances?: number;

  @IsNumber()
  @IsOptional()
  bonus?: number;

  @IsNumber()
  @IsOptional()
  incentives?: number;

  @IsNumber()
  @IsOptional()
  advances?: number;

  @IsNumber()
  @IsOptional()
  deductions?: number;

  @IsNumber()
  @IsOptional()
  paidDays?: number;

  @IsNumber()
  @IsOptional()
  absentDays?: number;

  @IsOptional()
  earningsBreakdown?: Record<string, any>;

  @IsOptional()
  deductionsBreakdown?: Record<string, any>;

  @IsString()
  @IsOptional()
  reason?: string;
}
