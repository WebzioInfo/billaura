import * as XLSX from 'xlsx';
import apiClient from '@/core/api';
import { ExportService } from '@/core/services/ExportService';
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
   * Generates a printable Vector PDF Table Document using backend engine.
   */
  static async generateTablePDF(options: PDFTableOptions): Promise<void> {
    try {
      const response = await apiClient.post('/documents/table/export', options, {
        responseType: 'blob'
      });
      ExportService.openPdfBlob(response.data);
    } catch (error) {
      console.error('Failed to generate table PDF:', error);
      throw error;
    }
  }

  /**
   * Generates an Excel Spreadsheet.
   */
  static generateExcel(options: ExcelExportOptions): void {
    const { filename, sheetName = 'Sheet 1', title, headers, data } = options;
    const exportData = [];

    if (title) {
      exportData.push([title]);
      exportData.push([]);
    }

    exportData.push(headers);
    data.forEach((row) => exportData.push(row));

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  /**
   * Generates a complete Enterprise Bulk Payroll Dossier PDF using backend engine.
   */
  static async generatePayrollDossierPDF(options: BulkPayrollReportOptions): Promise<void> {
    try {
      const response = await apiClient.post('/documents/payslip/export', options, {
        responseType: 'blob'
      });
      ExportService.openPdfBlob(response.data);
    } catch (error) {
      console.error('Failed to generate payroll dossier PDF:', error);
      throw error;
    }
  }
}
