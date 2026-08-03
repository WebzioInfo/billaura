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
import { CompanyContext } from "../common/context/company-context";
import { CustomersService } from "./customers.service";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query("search") search: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const items = await this.customersService.findAll(companyId, search);
    return { success: true, data: { items } };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const customer = await this.customersService.findOne(id, companyId);
    return { success: true, data: customer };
  }

  @Get(":id/ledger")
  async getLedger(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const data = await this.customersService.getLedger(id, companyId);
    return { success: true, data };
  }

  @Get(":id/analytics")
  async getAnalytics(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const data = await this.customersService.getAnalytics(id, companyId);
    return { success: true, data };
  }

  @Get(":id/history")
  async getHistory(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const history = await this.customersService.getHistory(id, companyId);
    return { success: true, data: history };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const item = await this.customersService.create(companyId, data);
    return { success: true, data: item, id: item.id };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const item = await this.customersService.update(id, companyId, data);
    return { success: true, data: item };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    await this.customersService.remove(id, companyId);
    return { success: true };
  }
}

