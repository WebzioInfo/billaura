import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ItemType, TaxCategory } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  taxGroupId?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  alias?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsString()
  @IsOptional()
  eInvoiceHsn?: string;

  @IsString()
  @IsOptional()
  scheduleNo?: string;

  @IsEnum(ItemType)
  @IsOptional()
  itemType?: ItemType;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  weightType?: string;

  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @IsString()
  @IsOptional()
  taxType?: string;

  @IsEnum(TaxCategory)
  @IsOptional()
  taxCategory?: TaxCategory;

  @IsBoolean()
  @IsOptional()
  isExempt?: boolean;

  @IsBoolean()
  @IsOptional()
  isNilRated?: boolean;

  @IsBoolean()
  @IsOptional()
  isNonGst?: boolean;

  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @IsNumber()
  @IsOptional()
  sellingPrice?: number;

  @IsNumber()
  @IsOptional()
  minStock?: number;

  @IsNumber()
  @IsOptional()
  maxStock?: number;

  @IsNumber()
  @IsOptional()
  reorderLevel?: number;

  @IsString()
  @IsOptional()
  pluNo?: string;

  @IsString()
  @IsOptional()
  valuationMethod?: string;

  @IsString()
  @IsOptional()
  salesAccountId?: string;

  @IsString()
  @IsOptional()
  purchaseAccountId?: string;

  @IsString()
  @IsOptional()
  inventoryAccountId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

import { PartialType } from '@nestjs/mapped-types';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
