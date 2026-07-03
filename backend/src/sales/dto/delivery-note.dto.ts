import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus } from '@prisma/client';

export class DeliveryNoteItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  qty: number;
}

export class CreateDeliveryNoteDto {
  @IsString()
  @IsNotEmpty()
  businessPartnerId: string;

  @IsString()
  @IsNotEmpty()
  noteNo: string;

  @IsString()
  @IsOptional()
  salesOrderId?: string;

  @IsString()
  @IsNotEmpty()
  date: string; // ISO String

  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteItemDto)
  items: DeliveryNoteItemDto[];
}

export class UpdateDeliveryNoteDto {
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsString()
  @IsOptional()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteItemDto)
  @IsOptional()
  items?: DeliveryNoteItemDto[];
}
