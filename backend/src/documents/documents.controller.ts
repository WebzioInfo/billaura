import { Controller, Get, Post, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentEngineService } from './document-engine/document-engine.service';
import { PrismaService } from '../database/prisma.service';
import { format } from 'date-fns';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentEngine: DocumentEngineService,
    private readonly prisma: PrismaService
  ) {}

  @Get('attendance/export')
  async exportAttendance(@Req() req: any, @Query('date') date: string, @Res() res: Response) {
    const companyId = req.user.companyId;
    const targetDate = date ? new Date(date) : new Date();
    
    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        date: targetDate
      },
      include: { employee: true },
      orderBy: { employee: { name: 'asc' } }
    });

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    // Generate HTML for the Attendance Report
    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #2563eb; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }
            .status-present { color: #16a34a; font-weight: bold; }
            .status-absent { color: #dc2626; font-weight: bold; }
            .status-leave { color: #ca8a04; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${company?.companyName || 'Company'}</h1>
            <p>Daily Attendance Report</p>
            <p>Date: ${format(targetDate, 'dd MMM yyyy')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Total Hrs</th>
              </tr>
            </thead>
            <tbody>
              ${attendances.map(a => `
                <tr>
                  <td>${a.employee.employeeCode || ''}</td>
                  <td>${a.employee.name}</td>
                  <td class="status-${a.type.toLowerCase()}">${a.type}</td>
                  <td>${a.checkIn ? format(new Date(a.checkIn), 'HH:mm') : '-'}</td>
                  <td>${a.checkOut ? format(new Date(a.checkOut), 'HH:mm') : '-'}</td>
                  <td>${(a as any).totalTime || "-"}</td>
                </tr>
              `).join('')}
              ${attendances.length === 0 ? '<tr><td colspan="6" style="text-align: center">No attendance records found for this date.</td></tr>' : ''}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const pdfBuffer = await this.documentEngine.generatePdf(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Attendance_Report_${format(targetDate, 'yyyy-MM-dd')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Post('table/export')
  async exportTable(@Req() req: any, @Body() body: any, @Res() res: Response) {
    const { title, subtitle, columns, data } = body;
    const company = await this.prisma.company.findUnique({ where: { id: req.user.companyId } });

    let html = '<html><head><style>';
    html += 'body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 20px; color: #333; margin: 0; } ';
    html += '.header-box { background-color: #0f172a; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; color: white; } ';
    html += '.header-box h1 { margin: 0; font-size: 16px; font-weight: bold; } ';
    html += '.header-box .title-sec { text-align: right; } ';
    html += '.header-box h2 { margin: 0; font-size: 12px; font-weight: normal; } ';
    html += '.header-box p { margin: 4px 0 0; font-size: 10px; color: #94a3b8; } ';
    html += 'table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; } ';
    html += 'th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; } ';
    html += 'th { background-color: #f8fafc; font-weight: bold; text-align: left; } ';
    html += '.align-center { text-align: center; } ';
    html += '.align-right { text-align: right; } ';
    html += '</style></head><body>';
    
    html += '<div class="header-box">';
    html += '<h1>' + (company?.companyName || 'BILL AURA ENTERPRISE ERP') + '</h1>';
    html += '<div class="title-sec">';
    html += '<h2>' + (title || 'Document') + '</h2>';
    if (subtitle) html += '<p>' + subtitle + '</p>';
    html += '</div></div>';
    
    html += '<table><thead><tr>';
    (columns || []).forEach((col: any) => {
      html += '<th class="align-' + (col.align || 'left') + '">' + col.header + '</th>';
    });
    html += '</tr></thead><tbody>';
    
    (data || []).forEach((row: any) => {
      html += '<tr>';
      (columns || []).forEach((col: any) => {
        html += '<td class="align-' + (col.align || 'left') + '">' + (row[col.dataKey] !== undefined ? row[col.dataKey] : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></body></html>';

    const pdfBuffer = await this.documentEngine.generatePdf(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + String(title || 'Document').replace(/\\\\s+/g, '_') + '.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post('transaction/export')
  async exportTransaction(@Req() req: any, @Body() body: any, @Res() res: Response) {
    const { title, documentNo, date, status, partner, fields, columns, items, summary } = body;
    const company = await this.prisma.company.findUnique({ where: { id: req.user.companyId } });

    let html = '<html><head><style>';
    html += 'body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 30px; color: #333; margin: 0; } ';
    html += '.header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; } ';
    html += '.header-left h1 { margin: 0; font-size: 24px; font-weight: bold; color: #0f172a; } ';
    html += '.header-right h2 { margin: 0; font-size: 20px; font-weight: bold; color: #0f172a; text-align: right; } ';
    html += '.doc-info { margin-top: 10px; font-size: 12px; text-align: right; } ';
    html += '.doc-info p { margin: 2px 0; } ';
    html += '.partner-info { margin-top: 20px; font-size: 12px; } ';
    html += '.partner-info h3 { margin: 0 0 5px 0; font-size: 14px; font-weight: bold; } ';
    html += '.partner-info p { margin: 2px 0; } ';
    html += '.fields-grid { display: flex; flex-wrap: wrap; margin-top: 20px; font-size: 12px; } ';
    html += '.field-item { width: 33.33%; margin-bottom: 10px; } ';
    html += '.field-label { font-weight: bold; } ';
    html += 'table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; } ';
    html += 'th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; } ';
    html += 'th { background-color: #0f172a; color: white; font-weight: bold; text-align: left; } ';
    html += '.align-center { text-align: center; } ';
    html += '.align-right { text-align: right; } ';
    html += '.summary-box { margin-top: 20px; width: 100%; display: flex; justify-content: flex-end; } ';
    html += '.summary-table { width: 40%; font-size: 11px; } ';
    html += '.summary-table td { border: none; padding: 5px 10px; text-align: right; } ';
    html += '.summary-total td { font-weight: bold; font-size: 13px; border-top: 1px solid #0f172a; } ';
    html += '</style></head><body>';
    
    html += '<div class="header"><div class="header-left">';
    html += '<h1>' + (company?.companyName || 'BILL AURA ENTERPRISE ERP') + '</h1>';
    html += '</div><div class="header-right">';
    html += '<h2>' + (title?.toUpperCase() || 'DOCUMENT') + '</h2>';
    html += '<div class="doc-info">';
    html += '<p><strong>Document No:</strong> ' + documentNo + '</p>';
    html += '<p><strong>Date:</strong> ' + date + '</p>';
    html += '<p><strong>Status:</strong> ' + status + '</p>';
    html += '</div></div></div>';
    
    html += '<div class="partner-info">';
    html += '<h3>' + (partner?.title || 'TO:') + '</h3>';
    html += '<p><strong>' + (partner?.name || '') + '</strong></p>';
    if (partner?.address) html += '<p>' + partner.address + '</p>';
    if (partner?.taxNo) html += '<p>Tax No: ' + partner.taxNo + '</p>';
    html += '</div>';
    
    if (fields && fields.length > 0) {
      html += '<div class="fields-grid">';
      fields.forEach((f: any) => {
        html += '<div class="field-item"><span class="field-label">' + f.label + ':</span> ' + f.value + '</div>';
      });
      html += '</div>';
    }
    
    html += '<table><thead><tr>';
    (columns || []).forEach((col: any) => {
      html += '<th class="align-' + (col.align || 'left') + '">' + col.header + '</th>';
    });
    html += '</tr></thead><tbody>';
    
    (items || []).forEach((item: any) => {
      html += '<tr>';
      (columns || []).forEach((col: any) => {
        html += '<td class="align-' + (col.align || 'left') + '">' + (item[col.dataKey] !== undefined ? item[col.dataKey] : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    
    if (summary && summary.length > 0) {
      html += '<div class="summary-box"><table class="summary-table"><tbody>';
      summary.forEach((sum: any) => {
        html += '<tr class="' + (sum.isTotal ? 'summary-total' : '') + '">';
        html += '<td>' + sum.label + '</td><td>' + sum.value + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    
    html += '</body></html>';

    const pdfBuffer = await this.documentEngine.generatePdf(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + String(documentNo || 'Document').replace(/\\s+/g, '_') + '.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Post('standard/export')

  async exportStandardDocument(@Req() req: any, @Body() body: any, @Res() res: Response) {
    const { company, customer, document, items, totals, watermark } = body;
    const dbCompany = await this.prisma.company.findUnique({ where: { id: req.user.companyId } });

    let html = '<html><head><style>';
    html += 'body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 40px; color: #333; margin: 0; position: relative; } ';
    html += '.watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(0,0,0,0.05); font-weight: bold; z-index: -1; } ';
    html += '.header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; } ';
    html += '.company-info h1 { margin: 0; font-size: 24px; font-weight: bold; color: #0f172a; } ';
    html += '.company-info p { margin: 2px 0; font-size: 12px; } ';
    html += '.doc-info { text-align: right; } ';
    html += '.doc-info h2 { margin: 0; font-size: 24px; font-weight: bold; color: #0f172a; text-transform: uppercase; } ';
    html += '.doc-info p { margin: 2px 0; font-size: 12px; } ';
    html += '.parties { display: flex; justify-content: space-between; margin-top: 30px; font-size: 12px; } ';
    html += '.party-box { width: 45%; } ';
    html += '.party-box h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; } ';
    html += '.party-box p { margin: 3px 0; } ';
    html += 'table { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 12px; } ';
    html += 'th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; } ';
    html += 'th { background-color: #f8fafc; font-weight: bold; text-align: left; color: #0f172a; } ';
    html += '.text-right { text-align: right; } ';
    html += '.text-center { text-align: center; } ';
    html += '.summary { margin-top: 30px; display: flex; justify-content: flex-end; } ';
    html += '.summary-table { width: 350px; font-size: 12px; } ';
    html += '.summary-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; } ';
    html += '.summary-table .total-row td { font-size: 16px; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: none; } ';
    html += '.footer { margin-top: 50px; font-size: 10px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; } ';
    html += '</style></head><body>';
    
    if (watermark) html += '<div class="watermark">' + watermark + '</div>';
    
    html += '<div class="header"><div class="company-info">';
    html += '<h1>' + (company?.name || dbCompany?.companyName || 'COMPANY NAME') + '</h1>';
    html += '<p>' + (company?.address || dbCompany?.address || '') + '</p>';
    if (company?.gstin) html += '<p>GSTIN: ' + company.gstin + '</p>';
    if (company?.pan) html += '<p>PAN: ' + company.pan + '</p>';
    if (company?.email) html += '<p>Email: ' + company.email + '</p>';
    if (company?.phone) html += '<p>Phone: ' + company.phone + '</p>';
    html += '</div><div class="doc-info">';
    html += '<h2>' + (document?.title || 'DOCUMENT') + '</h2>';
    html += '<p><strong>Doc No:</strong> ' + (document?.documentNo || '-') + '</p>';
    html += '<p><strong>Date:</strong> ' + (document?.date ? new Date(document.date).toLocaleDateString() : '-') + '</p>';
    if (document?.dueDate) html += '<p><strong>Due Date:</strong> ' + new Date(document.dueDate).toLocaleDateString() + '</p>';
    if (document?.reference) html += '<p><strong>Reference:</strong> ' + document.reference + '</p>';
    html += '</div></div>';
    
    html += '<div class="parties"><div class="party-box">';
    html += '<h3>BILL TO</h3>';
    html += '<p><strong>' + (customer?.name || 'Customer Name') + '</strong></p>';
    html += '<p>' + (customer?.address || '') + '</p>';
    if (customer?.gstin) html += '<p>GSTIN: ' + customer.gstin + '</p>';
    if (customer?.email) html += '<p>Email: ' + customer.email + '</p>';
    if (customer?.phone) html += '<p>Phone: ' + customer.phone + '</p>';
    html += '</div></div>';
    
    html += '<table><thead><tr>';
    html += '<th>#</th><th>Item & Description</th><th class="text-center">HSN/SAC</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Tax %</th><th class="text-right">Amount</th>';
    html += '</tr></thead><tbody>';
    
    (items || []).forEach((item: any, i: number) => {
      html += '<tr>';
      html += '<td>' + (i + 1) + '</td>';
      html += '<td>' + (item.description || 'Item') + '</td>';
      html += '<td class="text-center">' + (item.hsn || '-') + '</td>';
      html += '<td class="text-right">' + (item.qty || 0) + '</td>';
      html += '<td class="text-right">' + Number(item.rate || 0).toFixed(2) + '</td>';
      html += '<td class="text-right">' + (item.taxPercent || 0) + '%</td>';
      html += '<td class="text-right">' + Number(item.total || 0).toFixed(2) + '</td>';
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    html += '<div class="summary"><table class="summary-table"><tbody>';
    html += '<tr><td>Sub Total</td><td class="text-right">' + (totals?.currency || "₹") + ' ' + Number(totals?.subTotal || 0).toFixed(2) + '</td></tr>';
    html += '<tr><td>Tax Amount</td><td class="text-right">' + (totals?.currency || "₹") + ' ' + Number(totals?.taxTotal || 0).toFixed(2) + '</td></tr>';
    if (totals?.cgstAmount) html += '<tr><td>CGST</td><td class="text-right">' + totals.currency + ' ' + Number(totals.cgstAmount).toFixed(2) + '</td></tr>';
    if (totals?.sgstAmount) html += '<tr><td>SGST</td><td class="text-right">' + totals.currency + ' ' + Number(totals.sgstAmount).toFixed(2) + '</td></tr>';
    if (totals?.igstAmount) html += '<tr><td>IGST</td><td class="text-right">' + totals.currency + ' ' + Number(totals.igstAmount).toFixed(2) + '</td></tr>';
    html += '<tr class="total-row"><td>Grand Total</td><td class="text-right">' + (totals?.currency || "₹") + ' ' + Number(totals?.grandTotal || 0).toFixed(2) + '</td></tr>';
    if (totals?.amountPaid) html += '<tr><td>Amount Paid</td><td class="text-right">' + totals.currency + ' ' + Number(totals.amountPaid).toFixed(2) + '</td></tr>';
    if (totals?.balance) html += '<tr><td><strong>Balance Due</strong></td><td class="text-right"><strong>' + totals.currency + ' ' + Number(totals.balance).toFixed(2) + '</strong></td></tr>';
    html += '</tbody></table></div>';
    
    html += '<div class="footer">';
    if (company?.bankDetails) html += '<p><strong>Bank Details:</strong> ' + company.bankDetails + '</p>';
    if (company?.terms) html += '<p><strong>Terms & Conditions:</strong><br/>' + company.terms + '</p>';
    html += '<p style="margin-top: 20px;">This is a computer generated document. No signature is required.</p>';
    html += '</div></body></html>';

    const pdfBuffer = await this.documentEngine.generatePdf(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + String(document?.documentNo || 'Document').replace(/\\s+/g, '_') + '.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
