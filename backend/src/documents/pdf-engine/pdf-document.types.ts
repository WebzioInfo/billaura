export interface PdfCompanyData {
  name: string;
  address?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  bankDetails?: string;
  terms?: string;
}

export interface PdfCustomerData {
  name: string;
  address?: string;
  gstin?: string;
  email?: string;
  phone?: string;
}

export interface PdfDocumentMeta {
  title: string;
  documentNo: string;
  date: string;
  dueDate?: string;
  reference?: string;
  status?: string;
  docType?: string;
  placeOfSupply?: string;
  paymentMode?: string;
  paymentReference?: string;
  watermark?: string;
}

export interface PdfLineItem {
  index: number;
  description: string;
  hsn?: string;
  qty: number;
  rate: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
}

export interface PdfTotalsData {
  subTotal: number;
  taxTotal: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
  grandTotal: number;
  amountPaid?: number;
  balanceDue?: number;
  currency?: string;
}

export interface PdfDocumentData {
  company: PdfCompanyData;
  customer: PdfCustomerData;
  document: PdfDocumentMeta;
  items: PdfLineItem[];
  totals: PdfTotalsData;
}
