import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { numberToWords } from '@/shared/utils/numberToWords';

export interface PDFTableOptions {
  title: string;
  subtitle?: string;
  columns: { header: string; dataKey: string; width?: number; align?: 'left' | 'center' | 'right' }[];
  data: Record<string, any>[];
  company?: { name: string; address?: string; logo?: string };
  orientation?: 'portrait' | 'landscape';
  generatedBy?: string;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  title?: string;
  headers: string[];
  data: (string | number)[][];
}

export interface BulkPayrollReportOptions {
  company?: { name: string; address?: string; phone?: string; email?: string };
  items: {
    salarySlip: any;
    attendances?: any[];
  }[];
  generatedBy?: string;
  filename?: string;
}

export class ReportEngine {
  /**
   * Generates a printable Vector PDF Table Document.
   */
  static generateTablePDF(options: PDFTableOptions): jsPDF {
    const {
      title,
      subtitle,
      columns,
      data,
      company,
      orientation = 'portrait',
      generatedBy = 'System Admin',
    } = options;

    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Header & Company Branding
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 20, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'BILL AURA ENTERPRISE ERP', margin, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, pageWidth - margin, 12, { align: 'right' });

    if (subtitle) {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(subtitle, pageWidth - margin, 16, { align: 'right' });
    }

    const columnStyles: Record<number, any> = {};
    columns.forEach((col, idx) => {
      columnStyles[idx] = {
        halign: col.align || 'left',
      };
      if (col.width) {
        columnStyles[idx].cellWidth = col.width;
      }
    });

    const tableRows = data.map((row) =>
      columns.map((col) => {
        const val = row[col.dataKey];
        if (typeof val === 'number' && col.dataKey.toLowerCase().includes('salary')) {
          return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
        }
        return val !== undefined && val !== null ? String(val) : '';
      })
    );

    autoTable(doc, {
      head: [columns.map((c) => c.header)],
      body: tableRows,
      startY: 25,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles,
      showHead: 'everyPage',
      didDrawPage: (dataArg) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.text(
          `Generated on ${new Date().toLocaleString()} by ${generatedBy} • Bill Aura Enterprise Reporting Engine`,
          margin,
          pageHeight - 7
        );
        doc.text(`Page ${dataArg.pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      },
    });

    return doc;
  }

  /**
   * Generates a complete Enterprise Bulk Payroll Dossier PDF with Real Monthly Attendance Calendar.
   */
  static generatePayrollDossierPDF(options: BulkPayrollReportOptions): jsPDF {
    const { company, items = [], generatedBy = 'HR Administrator' } = options;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    items.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }

      const slip = item.salarySlip || {};
      const emp = slip.employee || {};
      const attendances = item.attendances || [];

      // 1. Header & Company Branding Bar
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(company?.name || 'BILL AURA ENTERPRISE ERP', margin, 11);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(company?.address || 'Corporate Headquarters', margin, 16);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYROLL DOSSIER', pageWidth - margin, 11, { align: 'right' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const periodStr = slip.startDate && slip.endDate
        ? `${new Date(slip.startDate).toLocaleDateString()} to ${new Date(slip.endDate).toLocaleDateString()}`
        : 'Monthly Payroll';
      doc.text(periodStr, pageWidth - margin, 16, { align: 'right' });

      // 2. Employee Profile Card
      let currentY = 26;

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 26, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Name: ${emp.name || 'N/A'} (${emp.employeeCode || 'N/A'})`, margin + 3, currentY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Department: ${emp.department?.name || 'N/A'}`, margin + 3, currentY + 12);
      doc.text(`Designation: ${emp.designation?.name || 'N/A'}`, margin + 3, currentY + 17);
      doc.text(`Joining Date: ${emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}`, margin + 3, currentY + 22);

      const col2X = margin + 65;
      doc.text(`Bank A/C: ${emp.bankAccountNumber || 'N/A'}`, col2X, currentY + 6);
      doc.text(`Bank Name: ${emp.bankName || 'State Bank of India'}`, col2X, currentY + 12);
      doc.text(`IFSC: ${emp.ifscCode || 'SBIN0004920'}`, col2X, currentY + 17);

      const col3X = margin + 125;
      doc.text(`PAN: ${emp.panNumber || 'N/A'}`, col3X, currentY + 6);
      doc.text(`PF No: ${emp.pfNumber || 'N/A'}`, col3X, currentY + 12);
      doc.text(`ESI No: ${emp.esiNumber || 'N/A'}`, col3X, currentY + 17);

      currentY += 30;

      // 3. REAL ENTERPRISE MONTHLY ATTENDANCE CALENDAR (Sun - Sat Grid)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('MONTHLY ATTENDANCE CALENDAR GRID', margin, currentY);

      currentY += 3;

      const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const attMap = new Map<string, any>();
      attendances.forEach((a: any) => {
        if (a && a.date) {
          attMap.set(new Date(a.date).toISOString().split('T')[0], a);
        }
      });

      const startDate = slip.startDate ? new Date(slip.startDate) : new Date();
      const endDate = slip.endDate ? new Date(slip.endDate) : new Date();
      const dates: Date[] = [];
      const curr = new Date(startDate);
      while (curr <= endDate) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const cellMetaMap = new Map<string, { status: string; label: string }>();

      // Build Calendar Rows & Cell Metadata
      const calRows: string[][] = [];
      let currentWeek: string[] = Array(7).fill('');
      const firstDay = dates.length > 0 ? dates[0].getDay() : 0;
      let dayIdx = firstDay;

      dates.forEach((d) => {
        const dateStr = d.toISOString().split('T')[0];
        const rec = attMap.get(dateStr);
        const dayNum = d.getDate();

        let status = 'PRESENT';
        let label = 'Present';

        if (d > new Date()) {
          status = 'UPCOMING';
          label = 'Upcoming';
        } else if (d.getDay() === 0 || d.getDay() === 6) {
          status = 'WEEK_OFF';
          label = 'Week Off';
        }

        if (rec) {
          const t = (rec.type || rec.status || '').toUpperCase();
          if (t.includes('LEAVE') || t === 'L') {
            status = 'LEAVE';
            label = 'Leave';
          } else if (t === 'HOLIDAY' || t === 'H') {
            status = 'HOLIDAY';
            label = 'Holiday';
          } else if (t.includes('HALF') || t === 'HD') {
            status = 'HALF_DAY';
            label = 'Half Day';
          } else if (t === 'ABSENT' || t === 'A') {
            status = 'ABSENT';
            label = 'Absent';
          } else {
            status = 'PRESENT';
            label = 'Present';
          }
        }

        let timeStr = '';
        if (rec?.workingHours) {
          timeStr = `\n${rec.workingHours}h`;
        }

        const cellContent = `${dayNum}\n${label}${timeStr}`;
        currentWeek[dayIdx] = cellContent;
        cellMetaMap.set(cellContent, { status, label });

        dayIdx++;

        if (dayIdx === 7) {
          calRows.push(currentWeek);
          currentWeek = Array(7).fill('');
          dayIdx = 0;
        }
      });
      if (currentWeek.some((cell) => cell !== '')) {
        calRows.push(currentWeek);
      }

      autoTable(doc, {
        head: [calendarDays],
        body: calRows,
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 6.5,
          halign: 'center',
          cellPadding: 1.5,
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const cellText = data.cell.text.join('\n');
            const meta = cellMetaMap.get(cellText);
            if (meta) {
              switch (meta.status) {
                case 'PRESENT':
                  data.cell.styles.fillColor = [236, 253, 245];
                  data.cell.styles.textColor = [22, 163, 74];
                  break;
                case 'ABSENT':
                  data.cell.styles.fillColor = [254, 242, 242];
                  data.cell.styles.textColor = [220, 38, 38];
                  break;
                case 'LEAVE':
                case 'HALF_DAY':
                  data.cell.styles.fillColor = [254, 243, 199];
                  data.cell.styles.textColor = [217, 119, 6];
                  break;
                case 'HOLIDAY':
                  data.cell.styles.fillColor = [239, 246, 255];
                  data.cell.styles.textColor = [37, 99, 235];
                  break;
                case 'WEEK_OFF':
                  data.cell.styles.fillColor = [243, 244, 246];
                  data.cell.styles.textColor = [107, 114, 128];
                  break;
                case 'UPCOMING':
                  data.cell.styles.fillColor = [249, 250, 251];
                  data.cell.styles.textColor = [156, 163, 175];
                  break;
              }
            }
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 3;

      // 4. Attendance Insights Summary Table (Bottom Grid)
      const attSummary = slip.attendanceSummary || {};
      const eligibleDays = attSummary.daysInMonth || dates.length || 30;
      const presentDays = attSummary.present || slip.paidDays || 0;
      const absentDays = attSummary.absent || slip.absentDays || 0;
      const paidLeave = attSummary.leave || 0;
      const holidayCount = attSummary.holiday || 0;
      const weekOffCount = attSummary.weeklyOff || 0;
      const otHours = attSummary.otHours || 0;
      const attendancePct = attSummary.attendancePercentage || (eligibleDays > 0 ? Math.round((presentDays / eligibleDays) * 100) : 100);

      const metricsHead = ['Eligible Days', 'Present Days', 'Absent / LOP', 'Paid Leave', 'Holidays', 'Week Offs', 'OT Hours', 'Attendance %'];
      const metricsBody = [[
        String(eligibleDays),
        String(presentDays),
        String(absentDays),
        String(paidLeave),
        String(holidayCount),
        String(weekOffCount),
        `${otHours} hrs`,
        `${attendancePct}%`
      ]];

      autoTable(doc, {
        head: [metricsHead],
        body: metricsBody,
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 7, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59], halign: 'center' },
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;

      // 5. Earnings & Deductions Salary Breakdown Table
      const earnings = slip.earningsBreakdown || {
        "Basic Salary": { amount: Number(slip.basicSalary) || 0 },
        "Allowances": { amount: Number(slip.allowances) || 0 },
        "Bonus": { amount: Number(slip.bonus) || 0 }
      };

      const deductions = slip.deductionsBreakdown || {
        "Loss of Pay": { amount: Number(slip.deductions) || 0 }
      };

      const earnKeys = Object.keys(earnings);
      const dedKeys = Object.keys(deductions);
      const maxRows = Math.max(earnKeys.length, dedKeys.length, 1);

      const salaryRows: string[][] = [];
      let calcGross = 0;
      let calcDed = 0;

      for (let i = 0; i < maxRows; i++) {
        const eKey = earnKeys[i];
        const dKey = dedKeys[i];

        const eAmt = eKey ? (Number(earnings[eKey]?.amount) || 0) : null;
        const dAmt = dKey ? (Number(deductions[dKey]?.amount) || 0) : null;

        if (eAmt !== null) calcGross += eAmt;
        if (dAmt !== null) calcDed += dAmt;

        salaryRows.push([
          eKey || '',
          eAmt !== null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(eAmt) : '',
          dKey || '',
          dAmt !== null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(dAmt) : '',
        ]);
      }

      // Add Totals & Net Salary Row
      const finalNet = Number(slip.netSalary) || Math.max(0, calcGross - calcDed);

      salaryRows.push([
        'GROSS EARNINGS',
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(calcGross),
        'TOTAL DEDUCTIONS',
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(calcDed),
      ]);

      autoTable(doc, {
        head: [['EARNINGS', 'AMOUNT (INR)', 'DEDUCTIONS', 'AMOUNT (INR)']],
        body: salaryRows,
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
        columnStyles: {
          1: { halign: 'right' },
          3: { halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === salaryRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;

      // 6. Net Salary Summary Card
      doc.setFillColor(236, 253, 245); // Emerald-50
      doc.setDrawColor(167, 243, 208); // Emerald-200
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 1.5, 1.5, 'FD');

      doc.setTextColor(6, 78, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('NET PAYABLE SALARY:', margin + 3, currentY + 8);

      const netFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(finalNet);
      doc.setFontSize(11);
      doc.text(netFormatted, margin + 48, currentY + 8);

      // Amount in Words
      const netWords = numberToWords(finalNet);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      doc.text(`(${netWords})`, pageWidth - margin - 3, currentY + 8, { align: 'right' });

      currentY += 16;

      // 7. HR Digital Signature Stamp Line
      if (currentY + 15 < pageHeight - 15) {
        doc.setDrawColor(203, 213, 225);
        doc.line(pageWidth - margin - 45, currentY + 8, pageWidth - margin, currentY + 8);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Authorized Signature', pageWidth - margin - 22.5, currentY + 12, { align: 'center' });
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.text(
        `Generated on ${new Date().toLocaleString()} by ${generatedBy} • Bill Aura Enterprise Reporting Engine`,
        margin,
        pageHeight - 5
      );
      doc.text(`Page ${index + 1} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    });

    return doc;
  }

  /**
   * Generates a native Excel workbook (.xlsx).
   */
  static generateExcel(options: ExcelExportOptions): void {
    const { filename, sheetName = 'Sheet1', title, headers, data } = options;

    const sheetData: (string | number)[][] = [];

    if (title) {
      sheetData.push([title]);
      sheetData.push([]);
    }

    sheetData.push(headers);
    data.forEach((row) => sheetData.push(row));

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      data.forEach((r) => {
        const val = r[i] !== undefined && r[i] !== null ? String(r[i]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
    });

    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  }
}
