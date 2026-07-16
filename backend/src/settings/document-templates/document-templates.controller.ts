import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DocumentTemplatesService } from './document-templates.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { CurrentCompany } from '../../common/decorators/tenant.decorator';

@Controller('document-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentTemplatesController {
  constructor(private readonly templatesService: DocumentTemplatesService) {}

  @Post()
  create(@CurrentCompany() companyId: string, @Body() data: any) {
    return this.templatesService.create(companyId, data);
  }

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.templatesService.findAll(companyId);
  }

  @Get('default/:type')
  findDefault(@CurrentCompany() companyId: string, @Param('type') type: string) {
    return this.templatesService.findDefault(companyId, type);
  }

  @Get(':id')
  findOne(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.templatesService.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.templatesService.update(companyId, id, data);
  }

  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.templatesService.remove(companyId, id);
  }
}
