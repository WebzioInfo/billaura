export interface PdfBankInfo {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  branch?: string;
}

export interface PdfCompanyData {
  name: string;
  legalName?: string;
  address?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  bankDetails?: string;
  bankInfo?: PdfBankInfo;
  terms?: string;
}

export interface PdfCustomerData {
  name: string;
  legalName?: string;
  address?: string;
  shippingAddress?: string;
  gstin?: string;
  pan?: string;
  state?: string;
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
  reverseCharge?: boolean;
  paymentMode?: string;
  paymentReference?: string;
  watermark?: string;
  notes?: string;
  terms?: string;
}

export interface PdfLineItem {
  index: number;
  description: string;
  hsn?: string;
  qty: number;
  unit?: string;
  rate: number;
  taxPercent: number;
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
  total: number;
}

export interface PdfTaxBreakupItem {
  hsn: string;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
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
  roundOff?: number;
  amountInWords?: string;
  currency?: string;
}

export interface PdfDocumentData {
  company: PdfCompanyData;
  customer: PdfCustomerData;
  document: PdfDocumentMeta;
  items: PdfLineItem[];
  totals: PdfTotalsData;
  taxBreakup?: PdfTaxBreakupItem[];
}
