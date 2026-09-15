import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InvoiceConfigService } from './invoice-config.service';
import { CompanyContext } from '../../common/context/company-context';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
// Adjust imports as necessary based on Billaura's actual structure

@UseGuards(JwtAuthGuard)
@Controller('invoice-config')
export class InvoiceConfigController {
  constructor(private readonly configService: InvoiceConfigService) {}

  @Get('categories')
  getCategories() {
    return this.configService.getCategories(CompanyContext.getCompanyId()!);
  }

  @Post('categories')
  createCategory(@Body() body: any) {
    return this.configService.createCategory(CompanyContext.getCompanyId()!, body);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateCategory(id, CompanyContext.getCompanyId()!, body);
  }

  @Get('tax-treatments')
  getTaxTreatments() {
    return this.configService.getTaxTreatments(CompanyContext.getCompanyId()!);
  }

  @Post('tax-treatments')
  createTaxTreatment(@Body() body: any) {
    return this.configService.createTaxTreatment(CompanyContext.getCompanyId()!, body);
  }

  @Patch('tax-treatments/:id')
  updateTaxTreatment(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateTaxTreatment(id, CompanyContext.getCompanyId()!, body);
  }

  @Get('numbering-series')
  getNumberingSeries() {
    return this.configService.getNumberingSeries(CompanyContext.getCompanyId()!);
  }

  @Post('numbering-series')
  createNumberingSeries(@Body() body: any) {
    return this.configService.createNumberingSeries(CompanyContext.getCompanyId()!, body);
  }

  @Patch('numbering-series/:id')
  updateNumberingSeries(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateNumberingSeries(id, CompanyContext.getCompanyId()!, body);
  }
}
