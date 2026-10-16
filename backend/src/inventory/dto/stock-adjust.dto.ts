import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export enum StockAdjustmentType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  SET_ACTUAL = 'SET_ACTUAL',
}

export class StockAdjustDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId: string;

  @IsNumber()
  @IsOptional()
  quantityChange?: number;

  @IsEnum(StockAdjustmentType)
  @IsOptional()
  adjustmentType?: StockAdjustmentType;

  @IsNumber()
  @IsOptional()
  adjustmentQuantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Verified physical stock cannot be negative' })
  targetQuantity?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class StockQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
