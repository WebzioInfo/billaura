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
import { GoodsReceiptsService } from "./goods-receipts.service";
import {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
} from "./dto/goods-receipt.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("goods-receipts")
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.goodsReceiptsService.findAll(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.goodsReceiptsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateGoodsReceiptDto, @Req() req: any) {
    return this.goodsReceiptsService.create(dto, req.user?.userId);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateGoodsReceiptDto,
    @Req() req: any
  ) {
    return this.goodsReceiptsService.update(id, dto, req.user?.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string, @Req() req: any) {
    await this.goodsReceiptsService.remove(id, req.user?.userId);
  }
}
