import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AccountCategory } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AccountCategory)
  @IsNotEmpty()
  category: AccountCategory;

  @IsNumber()
  @IsOptional()
  balance?: number;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(AccountCategory)
  @IsOptional()
  category?: AccountCategory;

  @IsNumber()
  @IsOptional()
  balance?: number;
}
