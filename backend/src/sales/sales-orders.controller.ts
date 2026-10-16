import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { SalesOrdersService } from "./sales-orders.service";
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  SalesOrderQueryDto,
} from "./dto/sales-order.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller(["sales-orders", "sales/orders"])
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  async findAll(@Query() query: SalesOrderQueryDto) {
    return this.salesOrdersService.findAll(query);
  }

  @Get("next-number")
  async getNextNumber() {
    return this.salesOrdersService.getNextOrderNumber();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesOrdersService.update(id, dto);
  }

  @Put(":id")
  async replace(@Param("id") id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesOrdersService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.salesOrdersService.remove(id);
  }
}
