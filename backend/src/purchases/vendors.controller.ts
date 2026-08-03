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
import { VendorsService } from "./vendors.service";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  async findAll(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const companyId = CompanyContext.getCompanyId() as string;
    const data = await this.vendorsService.findAll(companyId, search, page, limit);

    return {
      success: true,
      data,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const item = await this.vendorsService.findOne(id, companyId);
    return { success: true, data: item };
  }

  @Post()
  async create(@Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const item = await this.vendorsService.create(companyId, data);
    return {
      success: true,
      data: item,
      message: "Vendor created successfully",
    };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    const companyId = CompanyContext.getCompanyId() as string;
    const item = await this.vendorsService.update(id, companyId, data);
    return {
      success: true,
      data: item,
      message: "Vendor updated successfully",
    };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    await this.vendorsService.remove(id, companyId);
    return { success: true, message: "Vendor deleted successfully" };
  }
}

