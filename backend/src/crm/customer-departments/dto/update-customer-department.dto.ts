import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDepartmentDto } from './create-customer-department.dto';

export class UpdateCustomerDepartmentDto extends PartialType(CreateCustomerDepartmentDto) {}
