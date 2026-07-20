import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsIn } from 'class-validator';

export class CreateCustomerDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['B2B', 'B2C', 'BOTH'])
  @IsOptional()
  customerType?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
