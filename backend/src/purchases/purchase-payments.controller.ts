import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PurchasePaymentsService } from './purchase-payments.service';
import { CreatePurchasePaymentDto, UpdatePurchasePaymentDto } from './dto/purchase-payment.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('purchases/payments')
export class PurchasePaymentsController {
  constructor(
    private readonly purchasePaymentsService: PurchasePaymentsService,
  ) {}

  @Get('next-number')
  async getNextNumber() {
    return this.purchasePaymentsService.getNextNumber();
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.purchasePaymentsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.purchasePaymentsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePurchasePaymentDto) {
    return this.purchasePaymentsService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePurchasePaymentDto) {
    return this.purchasePaymentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.purchasePaymentsService.remove(id);
  }
}
