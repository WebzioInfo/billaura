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
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsEnum(ItemType)
  @IsOptional()
  itemType?: ItemType;

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
  reorderLevel?: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsEnum(ItemType)
  @IsOptional()
  itemType?: ItemType;

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
  reorderLevel?: number;
}
