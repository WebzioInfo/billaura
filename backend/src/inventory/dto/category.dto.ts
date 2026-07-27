import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  name: string;

  @IsString({ message: 'code must be a string' })
  @IsOptional()
  code?: string;

  @IsString({ message: 'description must be a string' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'parentId must be a string' })
  @IsOptional()
  parentId?: string;

  @IsString({ message: 'status must be a string' })
  @IsOptional()
  status?: string;

  @IsString({ message: 'color must be a string' })
  @IsOptional()
  color?: string;

  @IsString({ message: 'icon must be a string' })
  @IsOptional()
  icon?: string;

  @IsNumber({}, { message: 'displayOrder must be a number' })
  @IsOptional()
  displayOrder?: number;

  @IsString({ message: 'imageUrl must be a string' })
  @IsOptional()
  imageUrl?: string;

  @IsString({ message: 'notes must be a string' })
  @IsOptional()
  notes?: string;
}

export class UpdateCategoryDto extends CreateCategoryDto {}
