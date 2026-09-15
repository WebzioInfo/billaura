import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PdfEngineService {
  constructor(private readonly prisma: PrismaService) {}

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
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    const docType = invoice.invoiceType || 'TAX_INVOICE';
    const isReceipt = ['FEE_RECEIPT', 'PAYMENT_RECEIPT', 'OTHER_RECEIPT'].includes(docType);
    const isQuotation = ['QUOTATION', 'ESTIMATE', 'PROFORMA_INVOICE'].includes(docType);
    const isBillOfSupply = docType === 'BILL_OF_SUPPLY';

    const documentTitle = docType.replace(/_/g, ' ');
    const gstBreakup: any = invoice.gstBreakup || {};

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
            .company-info h1 { font-size: 24px; margin: 0 0 6px 0; color: #0f172a; }
            .company-info p { margin: 2px 0; font-size: 13px; color: #475569; }
            .doc-title-box { text-align: right; }
            .doc-title { font-size: 26px; font-weight: 800; color: #2563eb; letter-spacing: 0.5px; text-transform: uppercase; }
            .doc-meta { margin-top: 8px; font-size: 13px; color: #334155; }
            .disclaimer { font-size: 11px; color: #64748b; font-style: italic; margin-top: 4px; }
            
            .details-grid { margin-top: 30px; display: flex; justify-content: space-between; background: #f8fafc; padding: 18px 24px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .details-col h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px 0; }
            .details-col p { margin: 3px 0; font-size: 14px; }

            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background-color: #f1f5f9; color: #0f172a; font-weight: 700; font-size: 13px; padding: 10px 14px; border-bottom: 2px solid #cbd5e1; text-align: left; }
            td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
            .num-cell { text-align: right; }
            
            .summary-section { margin-top: 24px; display: flex; justify-content: flex-end; }
            .summary-table { width: 320px; border-collapse: collapse; }
            .summary-table td { padding: 6px 12px; border: none; font-size: 13px; }
            .summary-table .total-row td { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-weight: 800; font-size: 16px; color: #0f172a; }

            .notes-block { margin-top: 30px; padding: 14px 18px; background: #fdfdfd; border-left: 4px solid #2563eb; border-radius: 4px; font-size: 12px; color: #475569; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>${company?.companyName || 'Bill Aura ERP'}</h1>
              <p>${company?.address || ''}</p>
              ${company?.gstin ? `<p><strong>GSTIN:</strong> ${company.gstin}</p>` : ''}
              ${company?.email ? `<p><strong>Email:</strong> ${company.email}</p>` : ''}
            </div>
            <div class="doc-title-box">
              <div class="doc-title">${documentTitle}</div>
              <div class="doc-meta">
                <p><strong>No:</strong> ${invoice.invoiceNo}</p>
                <p><strong>Date:</strong> ${invoice.date.toISOString().split('T')[0]}</p>
                ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${invoice.dueDate.toISOString().split('T')[0]}</p>` : ''}
              </div>
              ${isBillOfSupply ? '<div class="disclaimer">Composition / Exempt Supply - Not Eligible to Collect Tax</div>' : ''}
              ${isQuotation ? '<div class="disclaimer">Commercial Proposal (Non-Accounting Document)</div>' : ''}
            </div>
          </div>

          <div class="details-grid">
            <div class="details-col">
              <h3>${isReceipt ? 'Received From (Payer / Student)' : 'Bill To (Client / Customer)'}</h3>
              <p><strong>${invoice.businessPartner.name}</strong></p>
              ${invoice.businessPartner.email ? `<p>${invoice.businessPartner.email}</p>` : ''}
              ${invoice.businessPartner.gstin ? `<p>GSTIN: ${invoice.businessPartner.gstin}</p>` : ''}
              ${invoice.billingAddress ? `<p>${invoice.billingAddress}</p>` : ''}
            </div>
            <div class="details-col">
              <h3>Payment & Transaction Details</h3>
              <p><strong>Status:</strong> ${invoice.status}</p>
              ${gstBreakup.paymentMode ? `<p><strong>Payment Mode:</strong> ${gstBreakup.paymentMode}</p>` : ''}
              ${gstBreakup.paymentReference ? `<p><strong>Reference:</strong> ${gstBreakup.paymentReference}</p>` : ''}
              ${gstBreakup.sourceDocumentId ? `<p><strong>Source Document:</strong> ${gstBreakup.sourceDocumentId}</p>` : ''}
              ${invoice.placeOfSupply ? `<p><strong>Place of Supply:</strong> ${invoice.placeOfSupply}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 45%">Description</th>
                <th class="num-cell" style="width: 10%">Qty</th>
                <th class="num-cell" style="width: 15%">Rate (₹)</th>
                ${!isReceipt && Number(invoice.taxTotal) > 0 ? '<th class="num-cell" style="width: 10%">Tax</th>' : ''}
                <th class="num-cell" style="width: 15%">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.description}</td>
                  <td class="num-cell">${item.qty}</td>
                  <td class="num-cell">${Number(item.rate).toFixed(2)}</td>
                  ${!isReceipt && Number(invoice.taxTotal) > 0 ? `<td class="num-cell">${Number(item.taxAmount).toFixed(2)} (${item.taxPercent}%)</td>` : ''}
                  <td class="num-cell">${Number(item.total).toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="summary-section">
            <table class="summary-table">
              <tr>
                <td>Subtotal</td>
                <td class="num-cell">₹${Number(invoice.subTotal).toFixed(2)}</td>
              </tr>
              ${
                Number(invoice.cgstAmount) > 0
                  ? `<tr><td>CGST</td><td class="num-cell">₹${Number(invoice.cgstAmount).toFixed(2)}</td></tr>`
                  : ''
              }
              ${
                Number(invoice.sgstAmount) > 0
                  ? `<tr><td>SGST</td><td class="num-cell">₹${Number(invoice.sgstAmount).toFixed(2)}</td></tr>`
                  : ''
              }
              ${
                Number(invoice.igstAmount) > 0
                  ? `<tr><td>IGST</td><td class="num-cell">₹${Number(invoice.igstAmount).toFixed(2)}</td></tr>`
                  : ''
              }
              ${
                Number(invoice.cessAmount) > 0
                  ? `<tr><td>Cess</td><td class="num-cell">₹${Number(invoice.cessAmount).toFixed(2)}</td></tr>`
                  : ''
              }
              <tr class="total-row">
                <td>Grand Total</td>
                <td class="num-cell">₹${Number(invoice.grandTotal).toFixed(2)}</td>
              </tr>
              ${
                Number(invoice.amountPaid) > 0
                  ? `<tr><td>Amount Paid</td><td class="num-cell">₹${Number(invoice.amountPaid).toFixed(2)}</td></tr>`
                  : ''
              }
            </table>
          </div>

          ${
            gstBreakup.notes || gstBreakup.termsConditions
              ? `
            <div class="notes-block">
              ${gstBreakup.notes ? `<p><strong>Notes:</strong> ${gstBreakup.notes}</p>` : ''}
              ${gstBreakup.termsConditions ? `<p><strong>Terms & Conditions:</strong> ${gstBreakup.termsConditions}</p>` : ''}
            </div>
          `
              : ''
          }

          <div class="footer">
            <p>Thank you for your business. Generated by Bill Aura Universal Document Engine.</p>
          </div>
        </body>
      </html>
    `;

    // Render PDF with Puppeteer
    const puppeteerModule = await import('puppeteer');
    const puppeteer = puppeteerModule.default || puppeteerModule;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}
