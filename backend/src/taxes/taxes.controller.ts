import { Controller, Get, UseGuards } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get('gstr-1')
  async getGstr1() {
    return this.taxesService.getGstr1();
  }

  @Get('gstr-2')
  async getGstr2() {
    return this.taxesService.getGstr2();
  }

  @Get('summary')
  async getTaxSummary() {
    return this.taxesService.getTaxSummary();
  }
}
