import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { StandardPdfDocument, PdfDocumentProps } from './StandardPdfDocument';

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
  return (
    <PDFDownloadLink
      document={<StandardPdfDocument {...data} />}
      fileName={filename}
      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors ${className}`}
    >
      {/* @ts-ignore */}
      {({ blob, url, loading, error }) =>
        loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download PDF
          </>
        )
      }
    </PDFDownloadLink>
  );
};
