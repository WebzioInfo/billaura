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
@Controller("customers")
export class CustomersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query("search") search: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const where: any = { companyId, deletedAt: null, bpType: "CUSTOMER" };
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
      customerCode,
      mobile,
      whatsapp,
      email,
      gstin,
      gstNumber,
      panNumber,
      customerType,
      tradeName,
      address,
      pinCode,
      state,
      stateCode,
      placeOfSupply,
      creditLimit,
    } = data;
    const item = await this.prisma.businessPartner.create({
      data: {
        name,
        bpCode:
          customerCode ||
          "CUST-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
        bpType: "CUSTOMER",
        phone: mobile,
        whatsapp,
        email,
        gstin: gstin || gstNumber,
        panNumber,
        customerType: customerType || "UNREGISTERED",
        tradeName,
        address,
        pinCode,
        state,
        stateCode,
        placeOfSupply,
        creditLimit: creditLimit ? Number(creditLimit) : 0,
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
      customerCode,
      mobile,
      whatsapp,
      email,
      gstin,
      gstNumber,
      panNumber,
      customerType,
      tradeName,
      address,
      pinCode,
      state,
      stateCode,
      placeOfSupply,
      creditLimit,
    } = data;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (customerCode !== undefined) updateData.bpCode = customerCode;
    if (mobile !== undefined) updateData.phone = mobile;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (email !== undefined) updateData.email = email;
    if (gstin !== undefined || gstNumber !== undefined)
      updateData.gstin = gstin || gstNumber;
    if (panNumber !== undefined) updateData.panNumber = panNumber;
    if (customerType !== undefined) updateData.customerType = customerType;
    if (tradeName !== undefined) updateData.tradeName = tradeName;
    if (address !== undefined) updateData.address = address;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (state !== undefined) updateData.state = state;
    if (stateCode !== undefined) updateData.stateCode = stateCode;
    if (placeOfSupply !== undefined) updateData.placeOfSupply = placeOfSupply;
    if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit);

    const item = await this.prisma.businessPartner.updateMany({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" },
      data: updateData,
    });
    return { success: true, data: item };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    await this.prisma.businessPartner.updateMany({
      where: { id, companyId, deletedAt: null, bpType: "CUSTOMER" },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
