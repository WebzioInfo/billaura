import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @IsNumber()
  @IsOptional()
  decimals?: number;
}

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  abbreviation?: string;

  @IsNumber()
  @IsOptional()
  decimals?: number;
}
