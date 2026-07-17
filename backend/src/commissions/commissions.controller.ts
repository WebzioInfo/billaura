import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { CommissionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CompanyContext } from '../common/context/company-context';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post('rules')
  createRule(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId()!;
    return this.commissionsService.createRule(companyId, data);
  }

  @Get('rules')
  getRules() {
    const companyId = CompanyContext.getCompanyId()!;
    return this.commissionsService.getRules(companyId);
  }

  @Get('records')
  getRecords() {
    const companyId = CompanyContext.getCompanyId()!;
    return this.commissionsService.getRecords(companyId);
  }

  @Put('records/:id/status')
  updateRecordStatus(
    @Param('id') id: string,
    @Body('status') status: CommissionStatus,
  ) {
    const companyId = CompanyContext.getCompanyId()!;
    return this.commissionsService.updateRecordStatus(companyId, id, status);
  }
}
