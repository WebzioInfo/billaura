import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('sales/recurring-invoices')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RecurringInvoicesController {
  constructor(private readonly recurringInvoicesService: RecurringInvoicesService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.recurringInvoicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recurringInvoicesService.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.recurringInvoicesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.recurringInvoicesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recurringInvoicesService.remove(id);
  }
}
