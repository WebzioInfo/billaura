import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class InvoiceItemDto {
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
  cessPercent?: number;

  @IsString()
  @IsOptional()
  taxPreference?: string;
}

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  businessPartnerId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  taxMode?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsNumber()
  @IsOptional()
  subTotal?: number;

  @IsNumber()
  @IsOptional()
  taxTotal?: number;

  @IsNumber()
  @IsOptional()
  cgstAmount?: number;

  @IsNumber()
  @IsOptional()
  sgstAmount?: number;

  @IsNumber()
  @IsOptional()
  igstAmount?: number;

  @IsNumber()
  @IsOptional()
  cessAmount?: number;

  @IsNumber()
  @IsOptional()
  totalTaxAmount?: number;

  @IsNumber()
  @IsOptional()
  grandTotal?: number;

  @IsString()
  @IsOptional()
  referralSourceType?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  referralPartnerId?: string;

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
  invoiceNo?: string;

  @IsString()
  @IsOptional()
  documentNo?: string;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  termsConditions?: string;

  @IsString()
  @IsOptional()
  invoiceCategoryId?: string;

  @IsString()
  @IsOptional()
  taxTreatmentId?: string;

  @IsString()
  @IsOptional()
  taxPreference?: string;

  @IsString()
  @IsOptional()
  numberingSeriesId?: string;

  @IsString()
  @IsOptional()
  taxExemptionReason?: string;

  @IsString()
  @IsOptional()
  sourceDocumentId?: string;

  @IsString()
  @IsOptional()
  sourceDocumentType?: string;

  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsNumber()
  @IsOptional()
  amountPaid?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}

export class UpdateInvoiceStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string; // DocumentStatus enum
}

export class InvoiceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  invoiceType?: string;
}
