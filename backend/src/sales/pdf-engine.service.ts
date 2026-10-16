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
      where: { id: invoiceId, companyId, deletedAt: null },
      include: {
        businessPartner: true,
        items: { include: { product: true }, orderBy: { id: 'asc' } },
        taxTreatment: true,
        template: true,
      },
    });

    if (!invoice) throw new NotFoundException('Document not found');

    let template = (invoice as any).template;
    if (!template) {
      template = await this.prisma.documentTemplate.findFirst({
        where: {
          companyId,
          OR: [{ docType: 'invoice' }, { type: 'invoice' }],
          isDefault: true,
        },
      });
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        settings: true,
        bankAccounts: {
          where: { deletedAt: null },
          orderBy: { isDefault: 'desc' },
          take: 1,
        },
      },
    });

    const pdfData = PdfDataBuilder.fromInvoiceModel(invoice, company, template);
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

  async generateQuotationPdf(quotationId: string, companyId: string): Promise<Buffer> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, companyId, deletedAt: null },
      include: {
        businessPartner: true,
        items: { include: { product: true }, orderBy: { id: 'asc' } },
        template: true,
      },
    });

    if (!quotation) throw new NotFoundException('Quotation not found');

    let template = (quotation as any).template;
    if (!template) {
      template = await this.prisma.documentTemplate.findFirst({
        where: {
          companyId,
          OR: [{ docType: 'quote' }, { type: 'quote' }],
          isDefault: true,
        },
      });
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        settings: true,
        bankAccounts: {
          where: { deletedAt: null },
          orderBy: { isDefault: 'desc' },
          take: 1,
        },
      },
    });

    const pdfData = PdfDataBuilder.fromQuotationModel(quotation, company, template);
    return await this.reactPdfEngine.renderDocumentPdf(pdfData);
  }
}
