import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class BillAllocationItemDto {
  @IsString()
  @IsNotEmpty()
  purchaseId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class CreatePurchasePaymentDto {
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @IsString()
  @IsOptional()
  paymentNumber?: string;

  @IsString()
  @IsOptional()
  paymentNo?: string;

  @IsString()
  @IsOptional()
  type?: 'BILL_PAYMENT' | 'VENDOR_ADVANCE';

  @IsString()
  @IsOptional()
  status?: 'DRAFT' | 'PAID';

  @IsString()
  @IsOptional()
  purchaseId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillAllocationItemDto)
  @IsOptional()
  allocations?: BillAllocationItemDto[];

  @IsString()
  @IsOptional()
  bankAccountId?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  chequeNumber?: string;

  @IsString()
  @IsOptional()
  sourceOfSupply?: string;

  @IsString()
  @IsOptional()
  destinationOfSupply?: string;

  @IsString()
  @IsOptional()
  descriptionOfSupply?: string;

  @IsBoolean()
  @IsOptional()
  isRcm?: boolean;

  @IsString()
  @IsOptional()
  tdsTaxId?: string;

  @IsNumber()
  @IsOptional()
  tdsRate?: number;

  @IsNumber()
  @IsOptional()
  tdsAmount?: number;

  @IsString()
  @IsOptional()
  depositToAccountId?: string;

  @IsArray()
  @IsOptional()
  attachedFiles?: any[];
}

export class UpdatePurchasePaymentDto extends CreatePurchasePaymentDto {}
