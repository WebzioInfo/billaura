import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PrismaService } from "../database/prisma.service";
import { CompanyContext } from "../common/context/company-context";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("vendors")
export class VendorsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query("search") search: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const where: any = { companyId, deletedAt: null, bpType: "VENDOR" };
    if (search) {
      where.name = { contains: search };
    }
    const items = await this.prisma.businessPartner.findMany({ where });
    return { success: true, data: { items } };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const {
      name,
      vendorCode,
      gstin,
      contactDetails,
      payableBalance,
      customerType,
      creditLimit,
    } = data;
    const item = await this.prisma.businessPartner.create({
      data: {
        name,
        bpCode:
          vendorCode ||
          "VEND-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
        bpType: "VENDOR",
        gstin,
        phone: contactDetails,
        customerType: customerType || "UNREGISTERED",
        creditLimit: creditLimit ? Number(creditLimit) : 0,
        payableBalance: payableBalance !== undefined ? payableBalance : 0,
        companyId,
      },
    });
    return { success: true, data: item, id: item.id };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const {
      name,
      vendorCode,
      gstin,
      contactDetails,
      payableBalance,
      customerType,
      creditLimit,
    } = data;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (vendorCode !== undefined) updateData.bpCode = vendorCode;
    if (gstin !== undefined) updateData.gstin = gstin;
    if (contactDetails !== undefined) updateData.phone = contactDetails;
    if (payableBalance !== undefined)
      updateData.payableBalance = payableBalance;
    if (customerType !== undefined) updateData.customerType = customerType;
    if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit);

    const item = await this.prisma.businessPartner.updateMany({
      where: { id, companyId, deletedAt: null, bpType: "VENDOR" },
      data: updateData,
    });
    return { success: true, data: item };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    await this.prisma.businessPartner.updateMany({
      where: { id, companyId, deletedAt: null, bpType: "VENDOR" },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
