import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEmail,
  IsDateString,
} from "class-validator";

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsString()
  @IsOptional()
  shiftId?: string;

  @IsString()
  @IsOptional()
  employmentTypeId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  costCenterId?: string;

  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @IsNumber()
  @IsOptional()
  basicSalary?: number;

  @IsString()
  @IsOptional()
  salaryType?: string;

  @IsOptional()
  allowances?: any;

  @IsOptional()
  bankDetails?: any;

  @IsString()
  @IsOptional()
  aadhaarNumber?: string;

  @IsString()
  @IsOptional()
  panNumber?: string;

  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsString()
  @IsOptional()
  shiftId?: string;

  @IsString()
  @IsOptional()
  employmentTypeId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @IsNumber()
  @IsOptional()
  basicSalary?: number;

  @IsString()
  @IsOptional()
  salaryType?: string;

  @IsOptional()
  allowances?: any;

  @IsOptional()
  bankDetails?: any;

  @IsString()
  @IsOptional()
  aadhaarNumber?: string;

  @IsString()
  @IsOptional()
  panNumber?: string;

  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
