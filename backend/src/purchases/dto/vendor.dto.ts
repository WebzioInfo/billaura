import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactPersonDto {
  @IsString()
  @IsOptional()
  salutation?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  workPhone?: string;

  @IsString()
  @IsOptional()
  mobile?: string;
}

export class BankAccountDto {
  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  ifsc?: string;

  @IsString()
  @IsOptional()
  branch?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class AddressDto {
  @IsString()
  @IsOptional()
  attention?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  street1?: string;

  @IsString()
  @IsOptional()
  street2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pinCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  fax?: string;
}

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty({ message: 'Vendor display name is required' })
  name: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  tradeName?: string;

  @IsString()
  @IsOptional()
  vendorCode?: string;

  @IsString()
  @IsOptional()
  salutation?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  workPhone?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  gstTreatment?: string;

  @IsString()
  @IsOptional()
  gstRegistrationStatus?: string;

  @IsString()
  @IsOptional()
  customerType?: string;

  @IsString()
  @IsOptional()
  taxPreference?: string;

  @IsString()
  @IsOptional()
  gstin?: string;

  @IsString()
  @IsOptional()
  panNumber?: string;

  @IsString()
  @IsOptional()
  placeOfSupply?: string;

  @IsString()
  @IsOptional()
  sourceOfSupply?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pinCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  msmeRegistered?: boolean;

  @IsString()
  @IsOptional()
  msmeRegNo?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  openingBalanceType?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  openingBalanceAmount?: number;

  @IsString()
  @IsOptional()
  openingBalanceDate?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  tdsTaxId?: string;

  @IsOptional()
  billingAddress?: AddressDto;

  @IsOptional()
  shippingAddress?: AddressDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContactPersonDto)
  contactPersons?: ContactPersonDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];

  @IsOptional()
  customFields?: Record<string, any>;

  @IsArray()
  @IsOptional()
  reportingTags?: any[];

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  documents?: any[];
}

export class UpdateVendorDto extends CreateVendorDto {}
