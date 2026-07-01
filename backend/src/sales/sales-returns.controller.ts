import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.salesReturnsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesReturnsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.salesReturnsService.create(dto);
  }
}
