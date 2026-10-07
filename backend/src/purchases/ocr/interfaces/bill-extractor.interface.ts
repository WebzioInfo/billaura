export interface ExtractionField<T = string> {
  value: T;
  confidence: number; // 0.0 to 1.0
  source: 'ocr' | 'calculated' | 'matched' | 'user';
  rawText?: string;
}

export interface ExtractedVendor {
  name: ExtractionField<string>;
  gstin?: ExtractionField<string>;
  address?: ExtractionField<string>;
  state?: ExtractionField<string>;
  stateCode?: ExtractionField<string>;
  phone?: ExtractionField<string>;
  email?: ExtractionField<string>;
  pan?: ExtractionField<string>;
}

export interface ExtractedInvoice {
  invoiceNumber: ExtractionField<string>;
  invoiceDate: ExtractionField<string>; // YYYY-MM-DD
  dueDate?: ExtractionField<string>;
  purchaseOrderNumber?: ExtractionField<string>;
  referenceNumber?: ExtractionField<string>;
}

export type RowClassification = 'PRODUCT' | 'SERVICE' | 'TAX' | 'DISCOUNT' | 'CHARGE' | 'SUBTOTAL' | 'TOTAL' | 'OTHER';

export interface ExtractedLineItem {
  id: string;
  name: ExtractionField<string>;
  extractedDescription?: string; // Exact invoice description preserved
  classification?: RowClassification;
  hsnSac?: ExtractionField<string>;
  quantity: ExtractionField<number>;
  unit: ExtractionField<string>;
  rate: ExtractionField<number>;
  discount: ExtractionField<number>;
  taxableAmount?: ExtractionField<number>;
  gstRate: ExtractionField<number>; // %
  cgstAmount?: ExtractionField<number>;
  sgstAmount?: ExtractionField<number>;
  igstAmount?: ExtractionField<number>;
  taxAmount: ExtractionField<number>;
  lineTotal: ExtractionField<number>;
  matchedProductId?: string;
  matchedProductName?: string;
  matchStatus?: 'EXISTING' | 'NEW' | 'SKIPPED' | 'NEEDS_REVIEW';
  matchConfidence?: number;
  candidateProduct?: {
    name: string;
    description?: string;
    itemType: 'PRODUCT' | 'SERVICE';
    hsnCode?: string;
    gstRate: number;
    unit?: string;
    isInventoryItem: boolean;
  };
}

export interface ExtractedTaxes {
  cgst: ExtractionField<number>;
  sgst: ExtractionField<number>;
  igst: ExtractionField<number>;
  cess?: ExtractionField<number>;
  totalTax: ExtractionField<number>;
  isRcm?: ExtractionField<boolean>;
}

export interface ExtractedTotals {
  subtotal: ExtractionField<number>;
  discount: ExtractionField<number>;
  taxableAmount: ExtractionField<number>;
  taxTotal: ExtractionField<number>;
  roundOff: ExtractionField<number>;
  grandTotal: ExtractionField<number>;
}

export interface BillExtractionWarning {
  field?: string;
  code: 'TOTAL_MISMATCH' | 'TAX_MISMATCH' | 'DUPLICATE_BILL' | 'VENDOR_MISMATCH' | 'PRODUCT_UNMATCHED' | 'LOW_CONFIDENCE' | 'INVALID_GSTIN';
  message: string;
  severity: 'warning' | 'error' | 'info';
}

export interface BillExtractionResult {
  vendor: ExtractedVendor;
  invoice: ExtractedInvoice;
  items: ExtractedLineItem[];
  taxes: ExtractedTaxes;
  totals: ExtractedTotals;
  overallConfidence: number; // 0.0 to 1.0
  warnings: BillExtractionWarning[];
  rawText: string;
  documentMeta: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    secureUrl: string;
    cloudinaryPublicId: string;
  };
  matchedVendor?: {
    id: string;
    name: string;
    gstin?: string;
    state?: string;
    confidence: number;
    matchType: 'GSTIN' | 'EXACT_NAME' | 'FUZZY_NAME';
  };
  duplicateCheck?: {
    isPossibleDuplicate: boolean;
    existingBillId?: string;
    existingPurchaseNo?: string;
    existingInvoiceNo?: string;
    existingDate?: string;
  };
}

export interface IBillDocumentExtractor {
  extractFromBuffer(
    buffer: Buffer,
    mimeType: string,
    meta: { fileName: string; secureUrl: string; cloudinaryPublicId: string; fileSize: number }
  ): Promise<BillExtractionResult>;
}
