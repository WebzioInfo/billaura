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
  filename = 'document.pdf',
  className = ''
}) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      notification.loading('Generating PDF...', { id: 'pdf-gen' });
      
      const response = await apiClient.post('/documents/standard/export', data, {
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      
      notification.success('PDF generated successfully', { id: 'pdf-gen' });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      notification.error('Failed to generate PDF', { id: 'pdf-gen' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download PDF
        </>
      )}
    </button>
  );
};
