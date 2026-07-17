import React, { forwardRef } from 'react';
import { InvoiceHeader } from './InvoiceHeader';
import { InvoiceCustomerInfo } from './InvoiceCustomerInfo';
import { InvoiceItemsTable, InvoiceItem } from './InvoiceItemsTable';
import { InvoiceSummary } from './InvoiceSummary';
import { InvoiceTerms } from './InvoiceTerms';
import { InvoiceFooter } from './InvoiceFooter';

export interface InvoiceTemplateData {
  company: {
    logo?: string;
    name: string;
    address: string;
    gstin: string;
    phone: string;
    email: string;
  };
  invoice: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    placeOfSupply?: string;
    salesPerson?: string;
  };
  billing: {
    name: string;
    address: string;
    gstin?: string;
    phone?: string;
    stateCode?: string;
    country?: string;
  };
  shipping?: {
    name: string;
    address: string;
    gstin?: string;
    phone?: string;
    stateCode?: string;
    country?: string;
  };
  items: InvoiceItem[];
  totals: {
    subtotal: number;
    cgstAmount?: number;
    cgstPercent?: number;
    sgstAmount?: number;
    sgstPercent?: number;
    igstAmount?: number;
    igstPercent?: number;
    discount?: number;
    roundOff?: number;
    grandTotal: number;
    paidAmount?: number;
    balanceDue: number;
  };
  isIgst: boolean;
  termsAndConditions?: string;
  notes?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
    branch?: string;
  };
  qrData?: string;
}

interface InvoiceTemplateProps {
  data: InvoiceTemplateData;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ data }, ref) => {
    return (
      <div ref={ref} className="print-container flex flex-col relative bg-white">
        <InvoiceHeader company={data.company} invoice={data.invoice} />
        <InvoiceCustomerInfo billing={data.billing} shipping={data.shipping} />
        <InvoiceItemsTable items={data.items} isIgst={data.isIgst} />
        <div className="mt-auto">
          <InvoiceSummary totals={data.totals} isIgst={data.isIgst} />
          <InvoiceTerms
            notes={data.notes}
            termsAndConditions={data.termsAndConditions}
            bankDetails={data.bankDetails}
            qrData={data.qrData}
          />
          <InvoiceFooter />
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
