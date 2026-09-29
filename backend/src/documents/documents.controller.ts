import { Controller, Get, Post, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PrismaService } from '../database/prisma.service';
import { ReactPdfEngineService } from './pdf-engine/react-pdf-engine.service';
import { PdfDocumentData } from './pdf-engine/pdf-document.types';
import { format } from 'date-fns';

@Controller('documents')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DocumentsController {
  constructor(
    private readonly reactPdfEngine: ReactPdfEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('attendance/export')
  async exportAttendance(@Req() req: any, @Query('date') date: string, @Res() res: Response) {
    try {
      const companyId = req.user?.companyId;
      const targetDate = date ? new Date(date) : new Date();

      const attendances = companyId
        ? await this.prisma.attendance.findMany({
            where: { companyId, date: targetDate },
            include: { employee: true },
            orderBy: { employee: { name: 'asc' } },
          })
        : [];

      const dbCompany = companyId
        ? await this.prisma.company.findUnique({
            where: { id: companyId },
            include: { settings: true },
          })
        : null;

      const logoSrc = dbCompany?.settings?.logoBase64 || dbCompany?.logo || undefined;

      const pdfData: PdfDocumentData = {
        company: {
          name: dbCompany?.companyName || 'BILL AURA ERP',
          address: dbCompany?.address || '',
          gstin: dbCompany?.gstin || '',
          pan: dbCompany?.pan || '',
          email: dbCompany?.email || '',
          phone: dbCompany?.phone || '',
          logoUrl: logoSrc,
        },
        customer: {
          name: 'Internal HR Department',
          address: 'Company Internal Document',
        },
        document: {
          title: 'Daily Attendance Report',
          documentNo: `ATT-${format(targetDate, 'yyyyMMdd')}`,
          date: format(targetDate, 'dd MMM yyyy'),
          status: 'GENERATED',
          docType: 'ATTENDANCE',
        },
        items: attendances.map((a, idx) => ({
          index: idx + 1,
          description: `${a.employee?.name || 'Employee'} (${a.employee?.employeeCode || 'N/A'}) - In: ${a.checkIn ? format(new Date(a.checkIn), 'HH:mm') : '-'}, Out: ${a.checkOut ? format(new Date(a.checkOut), 'HH:mm') : '-'}`,
          hsn: a.type || 'PRESENT',
          qty: 1,
          rate: 0,
          taxPercent: 0,
          taxAmount: 0,
          total: 0,
        })),
        totals: {
          subTotal: attendances.length,
          taxTotal: 0,
          grandTotal: attendances.length,
          currency: 'Records',
        },
      };

      const pdfBuffer = await this.reactPdfEngine.renderDocumentPdf(pdfData);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Attendance_Report_${format(targetDate, 'yyyy-MM-dd')}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      });

      res.end(pdfBuffer);
    } catch (err: any) {
      console.error('Failed to export attendance PDF:', err?.stack || err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err?.message || 'Failed to export attendance PDF' });
      }
    }
  }

  @Post('table/export')
  async exportTable(@Req() req: any, @Body() body: any, @Res() res: Response) {
    try {
      const { title, subtitle, columns, data } = body || {};
      const companyId = req.user?.companyId;

      const dbCompany = companyId
        ? await this.prisma.company.findUnique({
            where: { id: companyId },
            include: { settings: true },
          })
        : null;

      const logoSrc = dbCompany?.settings?.logoBase64 || dbCompany?.logo || undefined;

      const pdfData: PdfDocumentData = {
        company: {
          name: dbCompany?.companyName || 'BILL AURA ERP',
          address: dbCompany?.address || '',
          gstin: dbCompany?.gstin || '',
          pan: dbCompany?.pan || '',
          email: dbCompany?.email || '',
          phone: dbCompany?.phone || '',
          logoUrl: logoSrc,
        },
        customer: {
          name: subtitle || 'Exported System Report',
        },
        document: {
          title: title || 'EXPORT REPORT',
          documentNo: `REP-${format(new Date(), 'yyyyMMdd-HHmm')}`,
          date: format(new Date(), 'dd MMM yyyy'),
          status: 'COMPLETED',
          docType: 'REPORT',
        },
        items: (data || []).map((row: any, idx: number) => {
          const descStr = (columns || [])
            .map((c: any) => `${c.header}: ${row[c.dataKey] ?? '-'}`)
            .join(' | ');

          return {
            index: idx + 1,
            description: descStr,
            hsn: '-',
            qty: 1,
            rate: 0,
            taxPercent: 0,
            taxAmount: 0,
            total: 0,
          };
        }),
        totals: {
          subTotal: (data || []).length,
          taxTotal: 0,
          grandTotal: (data || []).length,
          currency: 'Rows',
        },
      };

      const pdfBuffer = await this.reactPdfEngine.renderDocumentPdf(pdfData);

      const safeTitle = String(title || 'Document').replace(/[\\/:*?"<>|]/g, '_');
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      });

      res.end(pdfBuffer);
    } catch (err: any) {
      console.error('Failed to export table PDF:', err?.stack || err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err?.message || 'Failed to export table PDF' });
      }
    }
  }

  @Post('standard/export')
  async exportStandardDocument(@Req() req: any, @Body() body: any, @Res() res: Response) {
    try {
      const { company, customer, document, items, totals, watermark } = body || {};
      const companyId = req.user?.companyId;

      let dbCompany: any = null;
      if (companyId) {
        try {
          dbCompany = await this.prisma.company.findUnique({
            where: { id: companyId },
            include: { settings: true },
          });
        } catch (dbErr: any) {
          console.warn('Tenant DB lookup deferred to payload fallback:', dbErr?.message || dbErr);
        }
      }


      const logoSrc = dbCompany?.settings?.logoBase64 || dbCompany?.logo || company?.logo || undefined;

      const cgstVal = totals?.cgstAmount ? Number(totals.cgstAmount) : 0;
      const sgstVal = totals?.sgstAmount ? Number(totals.sgstAmount) : 0;
      const igstVal = totals?.igstAmount ? Number(totals.igstAmount) : 0;
      const sumGst = cgstVal + sgstVal + igstVal;
      const rawTaxTotal = Number(totals?.taxTotal || 0);
      const finalTaxTotal = rawTaxTotal > 0 ? rawTaxTotal : sumGst;

      const companyAddress = [dbCompany?.address, dbCompany?.state, dbCompany?.country, dbCompany?.pinCode]
        .filter(Boolean)
        .join(', ') || company?.address || '';


      const pdfData: PdfDocumentData = {
        company: {
          name: dbCompany?.companyName || dbCompany?.legalName || company?.name || 'Company Name',
          address: companyAddress,
          gstin: dbCompany?.gstin || company?.gstin || '',
          pan: dbCompany?.pan || company?.pan || '',
          email: dbCompany?.email || company?.email || '',
          phone: dbCompany?.phone || company?.phone || '',
          logoUrl: logoSrc,
          bankDetails: dbCompany?.settings?.bankDetails || company?.bankDetails,
          terms: dbCompany?.settings?.termsAndConditions || company?.terms,
        },
        customer: {
          name: customer?.name || 'Customer Name',
          address: customer?.address || '',
          gstin: customer?.gstin || '',
          email: customer?.email || '',
          phone: customer?.phone || '',
        },
        document: {
          title: document?.title || 'TAX INVOICE',
          documentNo: document?.documentNo || 'DOC-001',
          date: document?.date ? new Date(document.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          dueDate: document?.dueDate ? new Date(document.dueDate).toLocaleDateString('en-IN') : undefined,
          reference: document?.reference,
          status: document?.status,
          docType: (document?.type || document?.title || 'INVOICE').toUpperCase(),
          watermark: watermark,
        },
        items: (items || []).map((item: any, idx: number) => ({
          index: idx + 1,
          description: item.description || 'Item',
          hsn: item.hsn || '',
          qty: Number(item.qty || 0),
          rate: Number(item.rate || 0),
          taxPercent: Number(item.taxPercent || 0),
          taxAmount: Number(item.taxAmount || 0),
          total: Number(item.total || 0),
        })),
        totals: {
          currency: totals?.currency || '₹',
          subTotal: Number(totals?.subTotal || 0),
          taxTotal: finalTaxTotal,
          cgstAmount: cgstVal > 0 ? cgstVal : undefined,
          sgstAmount: sgstVal > 0 ? sgstVal : undefined,
          igstAmount: igstVal > 0 ? igstVal : undefined,
          grandTotal: Number(totals?.grandTotal || 0),
          amountPaid: totals?.amountPaid ? Number(totals.amountPaid) : undefined,
          balanceDue: totals?.balance ? Number(totals.balance) : undefined,
        },
      };

      const pdfBuffer = await this.reactPdfEngine.renderDocumentPdf(pdfData);

      const safeDocNo = String(document?.documentNo || 'Document').replace(/[\\/:*?"<>|\r\n]/g, '-');
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeDocNo}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      });

      res.end(pdfBuffer);
    } catch (err: any) {
      console.error('Failed to export standard document PDF:', err?.stack || err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err?.message || 'Failed to export standard document PDF' });
      }
    }
  }

}
