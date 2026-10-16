import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  ArrayMinSize,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";
import { TaxMode, DocumentStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class SalesOrderItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  qty: number;

  @IsNumber()
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

export class CreateSalesOrderDto {
  @IsString()
  @IsOptional()
  businessPartnerId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  orderNo?: string;

  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @IsString()
  @IsOptional()
  documentNo?: string;

  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  invoiceType?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ValidateIf((o, v) => v !== '' && v !== null && v !== undefined)
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(TaxMode)
  @IsOptional()
  taxMode?: TaxMode;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsString()
  @IsOptional()
  referenceNo?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  salesperson?: string;

  @IsString()
  @IsOptional()
  salespersonId?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ValidateIf((o, v) => v !== '' && v !== null && v !== undefined)
  @IsDateString()
  @IsOptional()
  expectedShipmentDate?: string;

  @IsString()
  @IsOptional()
  deliveryMethod?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  termsConditions?: string;

  @IsNumber()
  @IsOptional()
  adjustment?: number;

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
  currency?: string;

  @IsString()
  @IsOptional()
  tdsTcsType?: string;

  @IsNumber()
  @IsOptional()
  tdsTcsAmount?: number;

  @IsArray()
  @ArrayMinSize(1, { message: "At least one line item is required" })
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];
}

export class UpdateSalesOrderDto extends PartialType(CreateSalesOrderDto) {}

export class SalesOrderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
