import { IsString, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class StockAdjustDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsNumber()
  @IsNotEmpty()
  quantityChange: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
