import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from "class-validator";

export class CreateCostCenterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsNumber()
  @IsOptional()
  monthlyBudget?: number;

  @IsNumber()
  @IsOptional()
  annualBudget?: number;
}

export class UpdateCostCenterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsNumber()
  @IsOptional()
  monthlyBudget?: number;

  @IsNumber()
  @IsOptional()
  annualBudget?: number;
}
