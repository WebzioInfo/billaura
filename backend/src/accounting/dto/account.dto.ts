import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { AccountCategory, AccountSubCategory } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class AccountLookupQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 100;

  @IsOptional()
  @IsEnum(AccountCategory)
  category?: AccountCategory;

  @IsOptional()
  @IsEnum(AccountSubCategory)
  subCategory?: AccountSubCategory;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isGroup?: boolean;

  @IsOptional()
  @IsString()
  allowedAccountTypes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

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
