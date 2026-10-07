import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { QuotationsService } from "./quotations.service";
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  UpdateQuotationStatusDto,
  QuotationQueryDto,
} from "./dto/quotation.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller(["sales/quotations", "quotations"])
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async findAll(@Query() query: QuotationQueryDto) {
    return this.quotationsService.findAll(query);
  }

  @Get("summary")
  async getSummary() {
    return this.quotationsService.getSummary();
  }

  @Get("next-number")
  async getNextNumber() {
    return this.quotationsService.getNextQuotationNumber();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.quotationsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateQuotationDto) {
    return this.quotationsService.create(dto);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateQuotationDto) {
    return this.quotationsService.update(id, dto);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateQuotationStatusDto
  ) {
    return this.quotationsService.updateStatus(id, dto.status);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.quotationsService.remove(id);
  }
}
