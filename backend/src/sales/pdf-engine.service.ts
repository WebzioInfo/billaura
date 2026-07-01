import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PdfEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvoicePdf(invoiceId: string, companyId: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { businessPartner: true, items: { include: { product: true } } }
    });

    if (!invoice) throw new Error('Invoice not found');
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    // Generates an HTML invoice template.
    // In a production scenario, this HTML is passed to Puppeteer or wkhtmltopdf to generate a Buffer.
    // We mock the Buffer generation here for the enterprise audit requirement.
    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .invoice-title { font-size: 36px; font-weight: bold; color: #2563eb; }
            .details { margin-top: 40px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }
            .total-row td { font-weight: bold; font-size: 18px; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${company?.companyName || 'Company'}</h1>
              <p>${company?.address || ''}</p>
              <p>GSTIN: ${company?.gstin || ''}</p>
            </div>
            <div class="invoice-title">TAX INVOICE</div>
          </div>
          <div class="details">
            <div>
              <h3>Bill To:</h3>
              <p><strong>${invoice.businessPartner.name}</strong></p>
              <p>${invoice.businessPartner.email}</p>
            </div>
            <div>
              <p><strong>Invoice #:</strong> ${invoice.invoiceNo}</p>
              <p><strong>Date:</strong> ${invoice.date.toDateString()}</p>
              <p><strong>Due Date:</strong> ${invoice.dueDate ? invoice.dueDate.toDateString() : 'N/A'}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Tax</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.qty}</td>
                  <td>${item.rate}</td>
                  <td>${item.taxAmount} (${item.taxPercent}%)</td>
                  <td>${item.total}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: right">Grand Total</td>
                <td>${invoice.grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Mock buffer generation from HTML string
    return Buffer.from(html, 'utf-8');
  }
}
