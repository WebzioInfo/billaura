import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
} from "class-validator";
import { AccountCategory, AccountSubCategory } from "@prisma/client";

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(AccountCategory)
  @IsNotEmpty()
  category: AccountCategory;

  @IsEnum(AccountSubCategory)
  @IsOptional()
  subCategory?: AccountSubCategory;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(AccountCategory)
  @IsOptional()
  category?: AccountCategory;

  @IsEnum(AccountSubCategory)
  @IsOptional()
  subCategory?: AccountSubCategory;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;

  @IsString()
  @IsOptional()
  parentId?: string;
}
