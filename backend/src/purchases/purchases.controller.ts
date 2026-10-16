import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { PurchasesService } from "./purchases.service";
import { CreatePurchaseDto } from "./dto/purchase.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.purchasesService.findAll(query);
  }

  @Get("next-number")
  async getNextNumber() {
    return this.purchasesService.getNextNumber();
  }

  @Get("payment-terms")
  async getPaymentTerms() {
    return this.purchasesService.getPaymentTerms();
  }

  @Post("payment-terms")
  async createPaymentTerm(@Body() dto: { termName: string; dueAfter: number }) {
    return this.purchasesService.createPaymentTerm(dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.purchasesService.remove(id);
  }
}
