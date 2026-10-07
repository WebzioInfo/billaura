import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateProductCandidateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  itemType?: string;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isInventoryItem?: boolean;
}

export class PurchaseItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  qty: number;

  @IsNumber()
  @IsNotEmpty()
  rate: number;

  @IsNumber()
  @IsOptional()
  taxPercent?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsBoolean()
  @IsOptional()
  createAsNewProduct?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProductCandidateDto)
  newProductData?: CreateProductCandidateDto;
}

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @IsString()
  @IsOptional()
  taxMode?: string;

  @IsBoolean()
  @IsOptional()
  isRcm?: boolean;

  @IsOptional()
  gstBreakup?: any;

  @IsString()
  @IsOptional()
  attachmentId?: string;
}

export class UpdatePurchaseDto extends CreatePurchaseDto {}
