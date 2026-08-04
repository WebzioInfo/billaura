import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
  Res
} from "@nestjs/common";
import { Response } from 'express';
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto, InvoiceQueryDto } from "./dto/invoice.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PdfEngineService } from "./pdf-engine.service";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("sales/invoices")
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfEngineService: PdfEngineService
  ) {}

  @Get()
  async findAll(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get("next-number")
  async getNextNumber(@Query('type') type?: string) {
    return this.invoicesService.getNextInvoiceNumber(type);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.invoicesService.remove(id);
  }

  @Get(":id/pdf")
  async exportPdf(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const pdfBuffer = await this.pdfEngineService.generateInvoicePdf(id, req.user.companyId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Invoice_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
