import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { PaymentMethod, PaidFromType, ApprovalStatus, TaxPreference } from "@prisma/client";

export class CreateExpenseDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  expenseAccountId?: string;

  @IsString()
  @IsOptional()
  paidThroughAccountId?: string;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsEnum(PaidFromType)
  @IsOptional()
  paidFromType?: PaidFromType;

  @IsString()
  @IsOptional()
  paidFromId?: string; // Depends on paidFromType (bankId, cashId, employeeId, vendorId)

  @IsString()
  @IsOptional()
  bankAccountId?: string;

  @IsString()
  @IsOptional()
  cashAccountId?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsBoolean()
  @IsOptional()
  isSaveAndNew?: boolean;

  @IsString()
  @IsOptional()
  vendorGstin?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  billNumber?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  expenseType?: string; // GOODS or SERVICES

  @IsString()
  @IsOptional()
  sacCode?: string;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsString()
  @IsOptional()
  hsnSac?: string;

  @IsString()
  @IsOptional()
  gstTreatment?: string;

  @IsString()
  @IsOptional()
  sourceOfSupply?: string;

  @IsString()
  @IsOptional()
  destinationOfSupply?: string;

  @IsBoolean()
  @IsOptional()
  reverseCharge?: boolean;

  @IsString()
  @IsOptional()
  amountIs?: string; // TAX_INCLUSIVE or TAX_EXCLUSIVE

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;

  @IsOptional()
  reportingTags?: any[];

  @IsOptional()
  attachments?: any[];

  @IsOptional()
  receiptUrls?: any[];

  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;

  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;

  @IsString()
  @IsOptional()
  status?: any;

  @IsBoolean()
  @IsOptional()
  taxApplicable?: boolean;

  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @IsEnum(TaxPreference)
  @IsOptional()
  taxPreference?: TaxPreference;

  @IsString()
  @IsOptional()
  taxMode?: string;

  @IsString()
  @IsOptional()
  taxType?: string;

  @IsNumber()
  @IsOptional()
  taxableAmount?: number;

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

  @IsString()
  @IsOptional()
  taxId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;
}

export class UpdateExpenseApprovalDto {
  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  approvalStatus: ApprovalStatus;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  expenseAccountId?: string;

  @IsString()
  @IsOptional()
  bankAccountId?: string;

  @IsString()
  @IsOptional()
  paidThroughAccountId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsString()
  @IsOptional()
  vendorGstin?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  billNumber?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  expenseType?: string; // GOODS or SERVICES

  @IsString()
  @IsOptional()
  sacCode?: string;

  @IsString()
  @IsOptional()
  hsnCode?: string;

  @IsString()
  @IsOptional()
  hsnSac?: string;

  @IsString()
  @IsOptional()
  gstTreatment?: string;

  @IsString()
  @IsOptional()
  sourceOfSupply?: string;

  @IsString()
  @IsOptional()
  destinationOfSupply?: string;

  @IsBoolean()
  @IsOptional()
  reverseCharge?: boolean;

  @IsString()
  @IsOptional()
  amountIs?: string; // TAX_INCLUSIVE or TAX_EXCLUSIVE

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;

  @IsOptional()
  reportingTags?: any[];

  @IsOptional()
  receiptUrls?: any[];

  @IsString()
  @IsOptional()
  taxId?: string;

  @IsBoolean()
  @IsOptional()
  taxApplicable?: boolean;

  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @IsEnum(TaxPreference)
  @IsOptional()
  taxPreference?: TaxPreference;

  @IsString()
  @IsOptional()
  taxMode?: string;

  @IsString()
  @IsOptional()
  taxType?: string;

  @IsNumber()
  @IsOptional()
  taxableAmount?: number;

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

  @IsString()
  @IsOptional()
  departmentId?: string;
}

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsBoolean()
  @IsOptional()
  defaultTaxApplicable?: boolean;

  @IsNumber()
  @IsOptional()
  defaultGstRate?: number;

  @IsEnum(TaxPreference)
  @IsOptional()
  defaultTaxPreference?: TaxPreference;

  @IsString()
  @IsOptional()
  defaultTaxMode?: string;

  @IsString()
  @IsOptional()
  defaultInputTaxAccountId?: string;
}

export class UpdateExpenseCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsBoolean()
  @IsOptional()
  defaultTaxApplicable?: boolean;

  @IsNumber()
  @IsOptional()
  defaultGstRate?: number;

  @IsEnum(TaxPreference)
  @IsOptional()
  defaultTaxPreference?: TaxPreference;

  @IsString()
  @IsOptional()
  defaultTaxMode?: string;

  @IsString()
  @IsOptional()
  defaultInputTaxAccountId?: string;
}
