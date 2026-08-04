import * as XLSX from 'xlsx';
import { ReportEngine, PDFTableOptions, ExcelExportOptions } from './ReportEngine';
import apiClient from '@/core/api';
import { ExportService } from '@/core/services/ExportService';

export interface TransactionPDFOptions {
  title: string;
  documentNo: string;
  date: string;
  status: string;
  company?: any;
  partner: any; // { title: string, name: string, address?: string, taxNo?: string }
  fields: { label: string, value: string }[];
  columns: { header: string; dataKey: string; width?: number; align?: 'left' | 'center' | 'right' }[];
  items: any[];
  summary: { label: string, value: string, isTotal?: boolean }[];
}

export class DocumentEngine {
  static async generateTablePDF(options: PDFTableOptions): Promise<void> {
    try {
      // Create a blob request to our generic backend table export endpoint
      const response = await apiClient.post('/documents/table/export', options, {
        responseType: 'blob'
      });
      ExportService.openPdfBlob(response.data);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      throw error;
    }
  }

  static generateExcel(options: ExcelExportOptions): void {
    return ReportEngine.generateExcel(options);
  }

  static async generateTransactionPDF(options: TransactionPDFOptions): Promise<void> {
    try {
      const response = await apiClient.post('/documents/transaction/export', options, {
        responseType: 'blob'
      });
      ExportService.openPdfBlob(response.data);
    } catch (error) {
      console.error('Failed to generate transaction PDF:', error);
      throw error;
    }
  }

  static exportToCSV(filename: string, rows: any[], headers?: string[]) {
    if (!rows || !rows.length) return;

    const separator = ',';
    const keys = Object.keys(rows[0]);
    const columnHeaders = headers || keys;

    const csvContent =
      columnHeaders.join(separator) +
      '\n' +
      rows.map(row => {
        return keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          if (typeof cell === 'string') {
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
          }
          return cell;
        }).join(separator);
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if ((navigator as any).msSaveBlob) {
      (navigator as any).msSaveBlob(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
