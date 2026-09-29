import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReactPdfEngineService } from '../documents/pdf-engine/react-pdf-engine.service';
import { PdfDataBuilder } from '../documents/pdf-engine/pdf-data.builder';

@Injectable()
export class PdfEngineService {
  private readonly logger = new Logger(PdfEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reactPdfEngine: ReactPdfEngineService,
  ) {}

  async generateInvoicePdf(invoiceId: string, companyId: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        businessPartner: true,
        items: { include: { product: true } },
        taxTreatment: true,
      },
    });

    if (!invoice) throw new NotFoundException('Document not found');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { settings: true },
    });

    const pdfData = PdfDataBuilder.fromInvoiceModel(invoice, company);
    return await this.reactPdfEngine.renderDocumentPdf(pdfData);
  }

  async generateReceiptPdf(receiptId: string, companyId: string): Promise<Buffer> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, companyId },
      include: {
        businessPartner: true,
        payments: true,
        allocations: { include: { invoice: true } },
      },
    });

    if (!receipt) throw new NotFoundException('Receipt not found');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { settings: true },
    });

    const pdfData = PdfDataBuilder.fromReceiptModel(receipt, company);
    return await this.reactPdfEngine.renderDocumentPdf(pdfData);
  }
}
