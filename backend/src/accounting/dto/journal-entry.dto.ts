import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class JournalEntriesQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  view?: string;
}

export class JournalLineDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  @IsOptional()
  debit?: number;

  @IsNumber()
  @IsOptional()
  credit?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateJournalEntryDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
