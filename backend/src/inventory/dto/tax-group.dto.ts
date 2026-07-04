import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class CreateTaxGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  totalRate?: number;

  @IsNumber()
  @IsOptional()
  cgstRate?: number;

  @IsNumber()
  @IsOptional()
  sgstRate?: number;

  @IsNumber()
  @IsOptional()
  igstRate?: number;

  @IsNumber()
  @IsOptional()
  cessRate?: number;
}

export class UpdateTaxGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  totalRate?: number;

  @IsNumber()
  @IsOptional()
  cgstRate?: number;

  @IsNumber()
  @IsOptional()
  sgstRate?: number;

  @IsNumber()
  @IsOptional()
  igstRate?: number;

  @IsNumber()
  @IsOptional()
  cessRate?: number;
}
