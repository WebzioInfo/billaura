import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
} from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class CreatePurchasePaymentDto {
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @IsString()
  @IsNotEmpty()
  purchaseId: string;

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
}
