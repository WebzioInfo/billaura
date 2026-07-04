import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { StockAdjustDto } from "./dto/stock-adjust.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post("adjust")
  async adjustStock(@Body() dto: StockAdjustDto) {
    return this.inventoryService.adjustStock(dto);
  }

  @Get("stocks")
  async getStocks(@Query() query: PaginationQueryDto) {
    return this.inventoryService.getStocks(query);
  }
}
