import { ExcelExportOptions } from '@/core/reporting/ReportEngine';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';

export class ExportService {
  /**
   * Generates and downloads a CSV file from an array of objects.
   */
  static exportCsv(filename: string, rows: any[], headers?: string[]) {
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
    
    if ((navigator as any).msSaveBlob) { // IE 10+
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

  /**
   * Generates and downloads an Excel file.
   */
  static exportExcel(options: ExcelExportOptions) {
    DocumentEngine.generateExcel(options);
  }

  /**
   * Downloads a generated PDF document from a blob.
   */
  static downloadPdfBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    if ((navigator as any).msSaveBlob) {
      (navigator as any).msSaveBlob(blob, filename);
    } else {
      link.setAttribute('href', url);
      link.setAttribute('download', filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Opens a PDF blob in a new tab for preview or printing.
   */
  static openPdfBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        // We do not call window.print() here. 
        // Modern browsers handle PDF blobs with a built-in PDF viewer 
        // that has its own print button.
      };
    }
  }
}
