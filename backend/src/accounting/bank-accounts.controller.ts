import { ConflictException, Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { CompanyContext } from "../common/context/company-context";
import { BankAccountsService } from "./bank-accounts.service";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("bank-accounts")
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  async findAll(
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("type") type?: string,
  ) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException("Company context is required");
    }

    const take = Math.min(parseInt(limit || "50", 10), 200);
    const term = search?.trim();

    const items = await this.bankAccountsService.findAll(companyId, term, take, type);

    return { success: true, data: { items } };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new ConflictException("Company context is required");
    }

    const item = await this.bankAccountsService.create(companyId, data);
    return { success: true, data: item, id: item.id };
  }
}
