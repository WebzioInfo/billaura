import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

export interface PdfDocumentProps {
  company: {
    name: string;
    address: string;
    gstin?: string;
    pan?: string;
    email?: string;
    phone?: string;
    logo?: string;
    bankDetails?: string;
    terms?: string;
  };
  customer: {
    name: string;
    address: string;
    gstin?: string;
    email?: string;
    phone?: string;
  };
  document: {
    title: string;
    documentNo: string;
    date: Date | string;
    dueDate?: Date | string;
    reference?: string;
    status?: string;
  };
  items: Array<{
    id: string;
    description: string;
    hsn?: string;
    qty: number;
    rate: number;
    taxPercent: number;
    taxAmount: number;
    total: number;
  }>;
  totals: {
    subTotal: number;
    taxTotal: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    grandTotal: number;
    amountPaid?: number;
    balance?: number;
    currency: string;
  };
  watermark?: string;
}

interface PdfDownloadButtonProps {
  data: PdfDocumentProps;
  filename?: string;
  className?: string;
}

export const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({
  data,
  filename,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      notification.loading('Generating PDF...', { id: 'pdf-gen' });

      const response: any = await apiClient.post('/documents/standard/export', data, {
        responseType: 'blob'
      });

      if (response && response.type === 'application/json') {
        const text = await response.text();
        let jsonMsg = 'Failed to generate PDF';
        try {
          const parsed = JSON.parse(text);
          jsonMsg = parsed.message || jsonMsg;
        } catch (_) {}
        throw new Error(jsonMsg);
      }

      const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
      const safeDocNo = (data.document?.documentNo || 'Document');
      const finalFileName = filename || `${safeDocNo}.pdf`;

      const { DownloadDirectoryManager } = await import('@/shared/utils/downloadDirectoryManager');
      const result = await DownloadDirectoryManager.saveDocument({
        blob,
        docTitle: data.document?.title,
        docType: (data as any)?.document?.type || data.document?.title,
        filename: finalFileName,
      });

      if (result.mode === 'filesystem') {
        notification.success(`PDF saved to ${result.relativePath}`, { id: 'pdf-gen' });
      } else {
        notification.success('PDF downloaded successfully', { id: 'pdf-gen' });
      }

    } catch (error: any) {
      console.error('Failed to download PDF:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to generate PDF';
      notification.error(errorMsg, { id: 'pdf-gen' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 text-gray-800" />
          <span className='text-gray-800'>Download PDF</span>
        </>
      )}
    </button>
  );
};
