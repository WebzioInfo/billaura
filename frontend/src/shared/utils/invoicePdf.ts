import apiClient from '@/core/api';
import toast from 'react-hot-toast';

/**
 * Sanitizes invoice document number for cross-platform safe file naming
 */
export function sanitizeInvoiceFilename(invoiceNo?: string, fallback = 'Invoice'): string {
  if (!invoiceNo) return `${fallback}.pdf`;
  const sanitized = String(invoiceNo).replace(/[/\\:*?"<>|\r\n\t]/g, '_').trim();
  return `${sanitized || fallback}.pdf`;
}

/**
 * Fetches the canonical invoice PDF Blob from the backend
 */
export async function fetchInvoicePdfBlob(invoiceId: string, inline = false): Promise<Blob> {
  const url = inline ? `/sales/invoices/${invoiceId}/pdf?inline=true` : `/sales/invoices/${invoiceId}/pdf`;
  const res: any = await apiClient.get(url, {
    responseType: 'blob',
  });

  const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/pdf' });

  // If the backend returned an error JSON inside the blob
  if (blob.type === 'application/json') {
    const text = await blob.text();
    let errorMsg = 'Failed to generate invoice PDF';
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.message || parsed.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return blob;
}

/**
 * Canonical browser PDF download without filesystem picker prompts
 */
export async function downloadInvoicePdf(invoiceId: string, invoiceNo?: string): Promise<void> {
  try {
    const blob = await fetchInvoicePdfBlob(invoiceId, false);
    const filename = sanitizeInvoiceFilename(invoiceNo, `Invoice_${invoiceId}`);

    const blobUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = blobUrl;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(blobUrl);
    }, 150);
  } catch (err: any) {
    console.error('Invoice PDF download error:', err);
    throw new Error(err.message || 'Unable to generate invoice PDF. Please try again.');
  }
}

/**
 * Canonical PDF Print system: Prints the exact invoice document PDF without printing ERP UI
 */
export async function printInvoicePdf(invoiceId: string): Promise<void> {
  try {
    const blob = await fetchInvoicePdfBlob(invoiceId, true);
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a hidden iframe pointing directly to the generated PDF
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr) {
        // Fallback for browsers that sandbox embedded PDF plugins: open print-ready PDF window
        console.warn('Iframe print intercepted, opening print window fallback:', printErr);
        const printWin = window.open(blobUrl, '_blank');
        if (printWin) {
          printWin.focus();
        }
      }
    };

    // Cleanup iframe and revoke object URL
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (_) {}
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    }, 5000);
  } catch (err: any) {
    console.error('Invoice print error:', err);
    throw new Error(err.message || 'Unable to prepare invoice for printing. Please try again.');
  }
}
