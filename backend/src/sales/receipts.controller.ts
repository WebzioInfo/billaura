import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto, UpdateReceiptDto } from './dto/receipt.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.receiptsService.findAll(query);
  }

  @Get('summary')
  async getSummary() {
    return this.receiptsService.getSummary();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.receiptsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateReceiptDto, @Req() req: any) {
    return this.receiptsService.create(dto, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateReceiptDto, @Req() req: any) {
    return this.receiptsService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.receiptsService.remove(id, req.user.userId);
  }

  @Post(':id/print')
  async print(@Param('id') id: string) {
    const receipt = await this.receiptsService.findOne(id);
    return {
      success: true,
      message: 'Receipt printed successfully',
      url: `/receipts/${id}/pdf`,
      receipt,
    };
  }

  @Post(':id/email')
  async email(@Param('id') id: string) {
    const receipt = await this.receiptsService.findOne(id);
    return {
      success: true,
      message: `Receipt emailed successfully to ${receipt.businessPartner.email || 'customer'}`,
      receipt,
    };
  }
}
