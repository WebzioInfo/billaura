import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CustomerDepartmentsService } from './customer-departments.service';
import { CreateCustomerDepartmentDto } from './dto/create-customer-department.dto';
import { UpdateCustomerDepartmentDto } from './dto/update-customer-department.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('customer-departments')
@UseGuards(JwtAuthGuard)
export class CustomerDepartmentsController {
  constructor(private readonly customerDepartmentsService: CustomerDepartmentsService) {}

  @Post()
  create(@Body() createDto: CreateCustomerDepartmentDto, @Req() req: any) {
    return this.customerDepartmentsService.create(req.user.companyId, req.user.id, createDto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.customerDepartmentsService.findAll(req.user.companyId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.customerDepartmentsService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDepartmentDto,
    @Req() req: any,
  ) {
    return this.customerDepartmentsService.update(id, req.user.companyId, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.customerDepartmentsService.remove(id, req.user.companyId);
  }
}
