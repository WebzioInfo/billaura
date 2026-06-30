import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query('search') search: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const where: any = { companyId };
    if (search) {
      where.name = { contains: search };
    }
    const items = await this.prisma.category.findMany({ where });
    return { success: true, data: { items } };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const item = await this.prisma.category.create({
      data: { ...data, companyId }
    });
    return { success: true, data: item, id: item.id };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const { id: _, companyId: __, createdAt, updatedAt, ...updateData } = data;
    const item = await this.prisma.category.updateMany({
      where: { id, companyId },
      data: updateData
    });
    return { success: true, data: item };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    await this.prisma.category.deleteMany({
      where: { id, companyId }
    });
    return { success: true };
  }
}
