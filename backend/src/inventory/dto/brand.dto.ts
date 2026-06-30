import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateBrandDto {
  @IsString()
  @IsOptional()
  name?: string;
}
