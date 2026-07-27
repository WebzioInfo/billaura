import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CompanyContext } from "../common/context/company-context";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("profit-loss")
  async getProfitLoss(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException("Company context is required");
    }

    // Default to current financial year or a sane default if not provided
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    return this.reportsService.generateProfitLoss(companyId, start, end);
  }

  @Get("cash-flow")
  async getCashFlow(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new BadRequestException("Company context is required");

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    return this.reportsService.generateCashFlow(companyId, start, end);
  }

  @Get("sales")
  async getSalesReport(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const companyId = CompanyContext.getCompanyId();
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportsService.generateSalesReport(companyId!, start, end);
  }

  @Get("purchases")
  async getPurchaseReport(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const companyId = CompanyContext.getCompanyId();
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    return this.reportsService.generatePurchaseReport(companyId!, start, end);
  }

  @Get("inventory")
  async getInventoryReport() {
    const companyId = CompanyContext.getCompanyId();
    return this.reportsService.generateInventoryReport(companyId!);
  }

  @Get("departmental")
  async getDepartmentalReport() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException("Company context is required");
    }
    return this.reportsService.generateDepartmentalReport(companyId);
  }

  @Get("customer-statement")
  async getCustomerStatement(
    @Query("customerId") customerId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new BadRequestException("Company context is required");
    if (!customerId) throw new BadRequestException("customerId is required");

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    return this.reportsService.generateCustomerStatement(companyId, customerId, start, end);
  }

  @Get("customer-ageing")
  async getCustomerAgeing(@Query("asOfDate") asOfDate?: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new BadRequestException("Company context is required");

    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    return this.reportsService.generateCustomerAgeing(companyId, asOf);
  }
}
