/**
 * Maps application document types and titles to target folder names inside "Bill Aura".
 *
 * Folder Mapping:
 * - TAX INVOICE / INVOICE -> Invoices
 * - RECEIPT / PAYMENT RECEIPT -> Receipts
 * - CREDIT NOTE -> Credit Notes
 * - DEBIT NOTE -> Debit Notes
 * - BILL OF SUPPLY -> Bills of Supply
 * - QUOTATION / ESTIMATE / PROFORMA -> Quotations
 * - Default -> Other Documents
 */
export function resolveDocumentFolder(docType?: string, docTitle?: string): string {
  const typeStr = String(docType || docTitle || '').toUpperCase().trim();

  if (!typeStr) {
    return 'Other Documents';
  }

  if (typeStr.includes('RECEIPT') || typeStr.startsWith('REC')) {
    return 'Receipts';
  }

  if (typeStr.includes('CREDIT') || typeStr.includes('CN_') || typeStr.startsWith('CN-')) {
    return 'Credit Notes';
  }

  if (typeStr.includes('DEBIT') || typeStr.includes('DN_') || typeStr.startsWith('DN-')) {
    return 'Debit Notes';
  }

  if (
    typeStr.includes('BILL OF SUPPLY') ||
    typeStr.includes('BILL_OF_SUPPLY') ||
    typeStr.includes('EXEMPT')
  ) {
    return 'Bills of Supply';
  }

  if (
    typeStr.includes('QUOTATION') ||
    typeStr.includes('ESTIMATE') ||
    typeStr.includes('PROFORMA') ||
    typeStr.includes('PROPOSAL') ||
    typeStr.startsWith('QTN')
  ) {
    return 'Quotations';
  }

  if (typeStr.includes('INVOICE') || typeStr.includes('INV')) {
    return 'Invoices';
  }

  return 'Other Documents';
}
