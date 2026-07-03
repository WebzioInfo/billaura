import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaxMode, DocumentStatus } from '@prisma/client';

export class SalesOrderItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  qty: number;

  @IsNumber()
  rate: number;

  @IsNumber()
  taxPercent: number;
}

export class CreateSalesOrderDto {
  @IsString()
  @IsNotEmpty()
  businessPartnerId: string;

  @IsString()
  @IsNotEmpty()
  orderNo: string;

  @IsString()
  @IsNotEmpty()
  date: string; // ISO String

  @IsEnum(TaxMode)
  @IsOptional()
  taxMode?: TaxMode;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];
}

export class UpdateSalesOrderDto {
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsString()
  @IsOptional()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  @IsOptional()
  items?: SalesOrderItemDto[];
}
