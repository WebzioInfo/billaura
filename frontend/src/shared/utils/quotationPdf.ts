import apiClient from '@/core/api';

/**
 * Sanitizes quotation document number for cross-platform safe file naming
 */
export function sanitizeQuotationFilename(quotationNo?: string, fallback = 'Quote'): string {
  if (!quotationNo) return `${fallback}.pdf`;
  const sanitized = String(quotationNo).replace(/[/\\:*?"<>|\r\n\t]/g, '_').trim();
  return `${sanitized || fallback}.pdf`;
}

/**
 * Fetches the canonical quotation PDF Blob from the backend
 */
export async function fetchQuotationPdfBlob(quotationId: string, inline = false): Promise<Blob> {
  const url = inline ? `/sales/quotations/${quotationId}/pdf?inline=true` : `/sales/quotations/${quotationId}/pdf`;
  const res: any = await apiClient.get(url, {
    responseType: 'blob',
  });

  const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/pdf' });

  if (blob.type === 'application/json') {
    const text = await blob.text();
    let errorMsg = 'Failed to generate quotation PDF';
    try {
      const parsed = JSON.parse(text);
      errorMsg = parsed.message || parsed.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return blob;
}

/**
 * Canonical browser PDF download for Quotes
 */
export async function downloadQuotationPdf(quotationId: string, quotationNo?: string): Promise<void> {
  try {
    const blob = await fetchQuotationPdfBlob(quotationId, false);
    const filename = sanitizeQuotationFilename(quotationNo, `Quote_${quotationId}`);

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
    console.error('Quotation PDF download error:', err);
    throw err;
  }
}
