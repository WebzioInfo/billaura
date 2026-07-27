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
  HttpStatus,
  HttpCode,
  Req,
} from "@nestjs/common";
import { PurchaseOrdersService } from "./purchase-orders.service";
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from "./dto/purchase-order.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get("next-number")
  async getNextNumber() {
    return this.purchaseOrdersService.getNextNumber();
  }

  @Get(":id/audit")
  async getAuditTrail(@Param("id") id: string) {
    return this.purchaseOrdersService.getAuditTrail(id);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    return this.purchaseOrdersService.create(dto, req.user?.userId);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Req() req: any
  ) {
    return this.purchaseOrdersService.update(id, dto, req.user?.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string, @Req() req: any) {
    await this.purchaseOrdersService.remove(id, req.user?.userId);
  }
}
