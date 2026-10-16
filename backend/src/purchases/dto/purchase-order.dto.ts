import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { TaxMode, DocumentStatus } from "@prisma/client";

export class PurchaseOrderItemDto {
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
  taxPercent: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  unit?: string;
  @IsString()
  @IsOptional()
  accountId?: string;
}

export class CreatePurchaseOrderDto {
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

  @IsString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  buyer?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  referenceNo?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  deliveryAddressType?: string;

  @IsString()
  @IsOptional()
  deliveryCustomerId?: string;

  @IsString()
  @IsOptional()
  deliveryCustomerName?: string;

  @IsString()
  @IsOptional()
  deliveryCustomerAddress?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  shipmentPreference?: string;

  @IsOptional()
  isRcm?: boolean;

  @IsString()
  @IsOptional()
  termsConditions?: string;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  discountType?: string;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  adjustment?: number;

  @IsString()
  @IsOptional()
  tdsTcsType?: string;

  @IsNumber()
  @IsOptional()
  tdsTcsRate?: number;

  @IsNumber()
  @IsOptional()
  tdsTcsAmount?: number;

  @IsString()
  @IsOptional()
  tdsTcsTaxId?: string;

  @IsArray()
  @IsOptional()
  attachedFiles?: any[];

  @Transform(({ value }) => (value === 'ISSUED' ? DocumentStatus.SENT : value))
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  subTotal?: number;

  @IsNumber()
  @IsOptional()
  taxTotal?: number;

  @IsNumber()
  @IsOptional()
  grandTotal?: number;

  @IsOptional()
  isSaveAndNew?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderDto {
  @IsString()
  @IsOptional()
  businessPartnerId?: string;

  @IsString()
  @IsOptional()
  orderNo?: string;

  @IsEnum(TaxMode)
  @IsOptional()
  taxMode?: TaxMode;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @Transform(({ value }) => (value === 'ISSUED' ? DocumentStatus.SENT : value))
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  subTotal?: number;

  @IsNumber()
  @IsOptional()
  taxTotal?: number;

  @IsNumber()
  @IsOptional()
  grandTotal?: number;

  @IsOptional()
  isSaveAndNew?: boolean;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  buyer?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  referenceNo?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  deliveryAddressType?: string;

  @IsString()
  @IsOptional()
  deliveryCustomerId?: string;

  @IsString()
  @IsOptional()
  deliveryCustomerName?: string;

  @IsString()
  @IsOptional()
  deliveryCustomerAddress?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  shipmentPreference?: string;

  @IsOptional()
  isRcm?: boolean;

  @IsString()
  @IsOptional()
  termsConditions?: string;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  discountType?: string;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  adjustment?: number;

  @IsString()
  @IsOptional()
  tdsTcsType?: string;

  @IsNumber()
  @IsOptional()
  tdsTcsRate?: number;

  @IsNumber()
  @IsOptional()
  tdsTcsAmount?: number;

  @IsString()
  @IsOptional()
  tdsTcsTaxId?: string;

  @IsArray()
  @IsOptional()
  attachedFiles?: any[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  @IsOptional()
  items?: PurchaseOrderItemDto[];
}
