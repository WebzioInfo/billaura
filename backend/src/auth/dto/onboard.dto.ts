import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class BusinessDetailsDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  businessType: string;
}

export class TaxDetailsDto {
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @IsString()
  @IsOptional()
  gstin?: string;

  @IsString()
  @IsOptional()
  pan?: string;

  @IsString()
  @IsOptional()
  tan?: string;

  @IsString()
  @IsOptional()
  msme?: string;
}

export class BranchSetupDto {
  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsDateString()
  @IsNotEmpty()
  fiscalYearStart: string;

  @IsDateString()
  @IsNotEmpty()
  fiscalYearEnd: string;

  @IsString()
  @IsNotEmpty()
  branchName: string;
}

export class SubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planName: string;
}
