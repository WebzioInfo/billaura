import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PrismaService } from "../database/prisma.service";
import { CompanyContext } from "../common/context/company-context";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("bank-accounts")
export class BankAccountsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query("search") search: string) {
    const companyId = CompanyContext.getCompanyId();
    const where: any = { companyId, deletedAt: null };
    if (search) {
      where.name = { contains: search };
    }
    const items = await this.prisma.bankAccount.findMany({ where });
    return { success: true, data: { items } };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId();
    const item = await this.prisma.bankAccount.create({
      data: { ...data, companyId },
    });
    return { success: true, data: item, id: item.id };
  }
}
