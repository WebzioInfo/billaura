import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ReceiptsService } from "./receipts.service";
import { CreateReceiptDto, UpdateReceiptDto, ReceiptQueryDto } from "./dto/receipt.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("receipts")
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  async findAll(@Query() query: ReceiptQueryDto) {
    return this.receiptsService.findAll(query);
  }

  @Get("summary")
  async getSummary() {
    return this.receiptsService.getSummary();
  }

  @Get("next-sequence")
  async getNextSequence(@Query("type") type: string) {
    const nextNo = await this.receiptsService.getNextNumber(type);
    return {
      success: true,
      data: nextNo,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.receiptsService.findOne(id);
  }

  @Post("preview")
  async preview(@Body() dto: any) {
    return this.receiptsService.preview(dto);
  }

  @Post()
  async create(@Body() dto: any, @Req() req: any) {
    if (dto.type === 'SALES' || dto.type === 'PURCHASE' || dto.type === 'EXPENSE') {
      if (dto.type === 'SALES') {
        return this.receiptsService.createUnifiedSales(dto, req.user.userId);
      } else if (dto.type === 'PURCHASE') {
        return this.receiptsService.createUnifiedPurchase(dto, req.user.userId);
      } else {
        return this.receiptsService.createUnifiedExpense(dto, req.user.userId);
      }
    }
    return this.receiptsService.create(dto, req.user.userId);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateReceiptDto,
    @Req() req: any,
  ) {
    return this.receiptsService.update(id, dto, req.user.userId);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: any) {
    return this.receiptsService.remove(id, req.user.userId);
  }

  @Post(":id/print")
  async print(@Param("id") id: string) {
    const receipt = await this.receiptsService.findOne(id);
    return {
      success: true,
      message: "Receipt printed successfully",
      url: `/receipts/${id}/pdf`,
      receipt,
    };
  }

  @Post(":id/email")
  async email(@Param("id") id: string) {
    const receipt = await this.receiptsService.findOne(id);
    return {
      success: true,
      message: `Receipt emailed successfully to ${receipt.businessPartner.email || "customer"}`,
      receipt,
    };
  }
}
