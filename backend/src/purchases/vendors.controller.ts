import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query('search') search: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const where: any = { companyId, deletedAt: null };
    if (search) {
      where.name = { contains: search };
    }
    const items = await this.prisma.vendor.findMany({ where });
    return { success: true, data: { items } };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const { name, vendorCode, gstin, contactDetails, payableBalance } = data;
    const item = await this.prisma.vendor.create({
      data: {
        name,
        vendorCode: vendorCode || ('VEND-' + Math.random().toString(36).substring(2, 7).toUpperCase()),
        gstin,
        contactDetails,
        payableBalance: payableBalance !== undefined ? payableBalance : 0,
        companyId,
      }
    });
    return { success: true, data: item, id: item.id };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const { name, vendorCode, gstin, contactDetails, payableBalance } = data;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (vendorCode !== undefined) updateData.vendorCode = vendorCode;
    if (gstin !== undefined) updateData.gstin = gstin;
    if (contactDetails !== undefined) updateData.contactDetails = contactDetails;
    if (payableBalance !== undefined) updateData.payableBalance = payableBalance;

    const item = await this.prisma.vendor.updateMany({
      where: { id, companyId, deletedAt: null },
      data: updateData
    });
    return { success: true, data: item };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    await this.prisma.vendor.updateMany({
      where: { id, companyId, deletedAt: null },
      data: { deletedAt: new Date() }
    });
    return { success: true };
  }
}
