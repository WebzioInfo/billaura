import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ReceiptAllocationDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class CreateReceiptDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  businessPartnerId: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  referenceNo?: string;

  @IsString()
  @IsOptional()
  chequeNo?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsDateString()
  @IsOptional()
  clearanceDate?: string;

  @IsNumber()
  @IsOptional()
  bankCharges?: number;

  @IsString()
  @IsOptional()
  cashier?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReceiptAllocationDto)
  allocations?: ReceiptAllocationDto[];
}

export class UpdateReceiptDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  referenceNo?: string;

  @IsString()
  @IsOptional()
  chequeNo?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsDateString()
  @IsOptional()
  clearanceDate?: string;

  @IsNumber()
  @IsOptional()
  bankCharges?: number;

  @IsString()
  @IsOptional()
  cashier?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class ReceiptQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
