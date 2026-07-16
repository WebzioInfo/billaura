import React from 'react';
import { DocumentTemplate } from '@/types/template';

interface DocumentRendererProps {
  template: Partial<DocumentTemplate>;
  data: any; // Invoice Data, PO Data, etc.
}

export function DocumentRenderer({ template, data }: DocumentRendererProps) {
  const { colors, typography, layout, elements } = template;

  const replacePlaceholders = (text: string | null) => {
    if (!text) return '';
    let result = text;
    // Common Placeholders
    result = result.replace(/{{CompanyName}}/g, data.companyName || 'Bill Aura Tech Pvt Ltd');
    result = result.replace(/{{InvoiceNumber}}/g, data.invoiceNo || 'INV-2023-001');
    result = result.replace(/{{CustomerName}}/g, data.customerName || 'Acme Corp');
    result = result.replace(/{{Total}}/g, data.grandTotal ? `₹${data.grandTotal}` : '₹1,18,000');
    return result;
  };

  return (
    <div 
      className="bg-white mx-auto print:shadow-none shadow-lg relative overflow-hidden"
      style={{
        width: layout?.orientation === 'LANDSCAPE' ? '297mm' : '210mm',
        minHeight: layout?.orientation === 'LANDSCAPE' ? '210mm' : '297mm',
        fontFamily: typography?.fontFamily || 'Inter',
        color: colors?.text || '#000',
        padding: layout?.margins || '20px',
        backgroundColor: colors?.background || '#fff'
      }}
    >
      {/* Header */}
      <div className="border-b-2 pb-6 flex justify-between items-start" style={{ borderColor: colors?.primary }}>
        <div>
          {elements?.showLogo && (
            <img src="/logo.png" alt="Logo" className="h-12 w-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold" style={{ color: colors?.primary }}>{template.type || 'INVOICE'}</h1>
          <div className="mt-2 text-sm text-gray-500">
            <p>{data.invoiceNo || 'INV-2023-001'}</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-bold text-lg">{data.companyName || 'Bill Aura Tech Pvt Ltd'}</h2>
          <p className="text-sm text-gray-600">123 Business Park, Tech Hub</p>
          {elements?.showGstin && <p className="text-sm text-gray-600">GSTIN: 27AAAAA0000A1Z5</p>}
          {elements?.showPan && <p className="text-sm text-gray-600">PAN: AAAAA0000A</p>}
        </div>
      </div>

      {/* Addresses */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Billed To</h3>
          <p className="font-bold">{data.customerName || 'Acme Corp'}</p>
          <p className="text-sm text-gray-600">456 Client Road</p>
          {elements?.showGstin && <p className="text-sm text-gray-600 mt-1">GSTIN: 07BBBBB1111B1Z2</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 text-left" style={{ borderColor: colors?.primary }}>
              <th className="py-2">Item</th>
              {elements?.showHsn && <th className="py-2">HSN</th>}
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">Enterprise License</td>
              {elements?.showHsn && <td className="py-3 text-gray-500">9983</td>}
              <td className="py-3 text-right">1</td>
              <td className="py-3 text-right">₹1,00,000</td>
              <td className="py-3 text-right font-medium">₹1,00,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Totals */}
      <div className="mt-8 flex justify-between">
        <div className="w-1/2 pr-8">
          {elements?.showBankDetails && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Bank Details</h4>
              <p className="text-sm">Bank: HDFC Bank</p>
              <p className="text-sm">A/C: 50200000000000</p>
              <p className="text-sm">IFSC: HDFC0000123</p>
            </div>
          )}
        </div>
        
        <div className="w-1/2">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>₹1,00,000</span>
          </div>
          {elements?.showTaxBreakup && (
            <>
              <div className="flex justify-between py-1 text-sm text-gray-500">
                <span>CGST (9%)</span>
                <span>₹9,000</span>
              </div>
              <div className="flex justify-between py-1 text-sm text-gray-500">
                <span>SGST (9%)</span>
                <span>₹9,000</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-3 mt-2 border-t-2 text-lg font-bold" style={{ borderColor: colors?.primary }}>
            <span>Grand Total</span>
            <span style={{ color: colors?.primary }}>₹1,18,000</span>
          </div>
        </div>
      </div>

      {/* Terms & Signatures */}
      {(elements?.showTerms || elements?.showSignature) && (
        <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-end">
          {elements?.showTerms && (
            <div className="w-2/3">
              <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Terms & Conditions</h4>
              <p className="text-xs text-gray-500 whitespace-pre-line">
                {replacePlaceholders(template.terms || '1. Payment due in 15 days.\n2. Subject to local jurisdiction.')}
              </p>
            </div>
          )}
          {elements?.showSignature && (
            <div className="w-1/3 text-center">
              <div className="h-16 border-b border-dashed border-gray-400 mb-2"></div>
              <p className="text-xs font-bold uppercase text-gray-500">Authorized Signature</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
