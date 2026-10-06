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
  Res,
  BadRequestException,
} from "@nestjs/common";
import { Response } from 'express';
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto, InvoiceQueryDto, BulkDownloadInvoicesDto } from "./dto/invoice.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { PdfEngineService } from "./pdf-engine.service";
import { ReceiptsService } from "./receipts.service";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("sales/invoices")
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfEngineService: PdfEngineService,
    private readonly receiptsService: ReceiptsService,
  ) {}

  @Get()
  async findAll(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get("summary")
  async getSummary(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.getSummary(query);
  }

  @Get("export")
  async exportCsv(@Query() query: InvoiceQueryDto, @Res() res: Response) {
    const csvContent = await this.invoicesService.getExportData(query);
    const today = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="BillAura_Invoices_${today}.csv"`,
    });
    res.end(csvContent);
  }

  @Post("bulk-pdf")
  async bulkDownloadPdf(@Body() dto: BulkDownloadInvoicesDto, @Req() req: any, @Res() res: Response) {
    await this.invoicesService.bulkDownloadPdf(dto.invoiceIds, req.user.companyId, res);
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
  async create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.invoicesService.create(dto, undefined, req?.user?.id);
  }

  @Post(":id/payments")
  async receivePayment(
    @Param("id") id: string,
    @Body() dto: any,
    @Req() req: any
  ) {
    const invoice = await this.invoicesService.findOne(id);
    const balanceDue = Math.max(0, Number(invoice.grandTotal) - Number(invoice.amountPaid));
    const amount = Number(dto.amount || 0);

    if (amount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero.");
    }
    if (amount > balanceDue + 0.01) {
      throw new BadRequestException(`Payment amount ₹${amount.toFixed(2)} exceeds remaining balance of ₹${balanceDue.toFixed(2)}.`);
    }

    const receiptDto = {
      date: dto.date || new Date().toISOString(),
      businessPartnerId: invoice.businessPartnerId,
      amount,
      paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
      referenceNo: dto.referenceNo || null,
      notes: dto.notes || null,
      accountId: dto.accountId || undefined,
      allocations: [
        {
          invoiceId: invoice.id,
          amount,
        },
      ],
      splitPayments: dto.splitPayments && dto.splitPayments.length > 0 ? dto.splitPayments : [
        {
          paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
          amount,
          accountId: dto.accountId || undefined,
          referenceNo: dto.referenceNo || null,
        }
      ]
    };

    const receipt = await this.receiptsService.create(receiptDto, req.user.userId);
    return {
      success: true,
      message: "Payment recorded successfully",
      data: {
        receiptId: receipt.id,
        receiptNo: receipt.receiptNo,
        amountReceived: amount,
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        remainingBalance: Math.max(0, balanceDue - amount),
      },
    };
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
