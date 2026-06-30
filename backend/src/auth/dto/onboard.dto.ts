import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

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
  @IsNotEmpty()
  taxNumber: string;
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
