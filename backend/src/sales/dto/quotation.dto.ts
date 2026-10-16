import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  ArrayMinSize,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";
import { DocumentStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class QuotationItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

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
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  discountType?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  taxName?: string;

  @IsNumber()
  @IsOptional()
  total?: number;
}

export class CreateQuotationDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  businessPartnerId?: string;

  @IsString()
  @IsOptional()
  docNo?: string;

  @IsString()
  @IsOptional()
  quotationNo?: string;

  @IsString()
  @IsOptional()
  documentNo?: string;

  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  invoiceType?: string;

  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  invoiceCategoryId?: string;

  @IsString()
  @IsOptional()
  taxTreatmentId?: string;

  @IsString()
  @IsOptional()
  numberingSeriesId?: string;

  @IsString()
  @IsOptional()
  taxExemptionReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  termsConditions?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  salesperson?: string;

  @IsString()
  @IsOptional()
  salespersonId?: string;

  @IsString()
  @IsOptional()
  referenceNo?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsNumber()
  @IsOptional()
  adjustment?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one line item is required' })
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {}

export class UpdateQuotationStatusDto {
  @IsEnum(DocumentStatus)
  status: DocumentStatus;
}

export class QuotationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
