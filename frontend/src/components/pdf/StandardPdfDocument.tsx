import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { pdfStyles as styles } from './PdfStyles';
import { format } from 'date-fns';

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

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const formatDate = (date: Date | string) => {
  if (!date) return '';
  return format(new Date(date), 'dd MMM yyyy');
};

export const StandardPdfDocument: React.FC<PdfDocumentProps> = ({
  company,
  customer,
  document,
  items,
  totals,
  watermark
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Watermark */}
      {watermark && (
        <View style={styles.watermark} fixed>
          <Text style={styles.watermarkText}>{watermark}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBlock}>
          {company.logo ? (
            <Image src={company.logo} style={styles.logo} />
          ) : (
            <Text style={styles.companyName}>{company.name}</Text>
          )}
          <Text style={styles.companyAddress}>{company.address}</Text>
          {company.gstin && <Text style={styles.companyAddress}>GSTIN: {company.gstin}</Text>}
          {company.email && <Text style={styles.companyAddress}>{company.email} | {company.phone}</Text>}
        </View>
        <View style={styles.documentMeta}>
          <Text style={styles.documentTitle}>{document.title}</Text>
          <View style={styles.metaTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Document No:</Text>
              <Text style={styles.metaValue}>{document.documentNo}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDate(document.date)}</Text>
            </View>
            {document.dueDate && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date:</Text>
                <Text style={styles.metaValue}>{formatDate(document.dueDate)}</Text>
              </View>
            )}
            {document.reference && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Reference:</Text>
                <Text style={styles.metaValue}>{document.reference}</Text>
              </View>
            )}
            {document.status && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Status:</Text>
                <Text style={[styles.metaValue, { color: document.status === 'PAID' ? '#16a34a' : '#ea580c' }]}>
                  {document.status}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Address Block */}
      <View style={styles.addressBlock}>
        <View style={styles.addressCol}>
          <Text style={styles.addressHeading}>Billed To</Text>
          <Text style={styles.addressName}>{customer.name}</Text>
          <Text style={styles.addressText}>{customer.address}</Text>
          {customer.gstin && <Text style={styles.addressText}>GSTIN: {customer.gstin}</Text>}
          {customer.email && <Text style={styles.addressText}>{customer.email} {customer.phone ? `| ${customer.phone}` : ''}</Text>}
        </View>
      </View>

      {/* Item Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.tableHeaderCell, styles.colNo]}>#</Text>
          <Text style={[styles.tableHeaderCell, styles.colItem]}>Item Description</Text>
          <Text style={[styles.tableHeaderCell, styles.colHsn]}>HSN/SAC</Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
          <Text style={[styles.tableHeaderCell, styles.colTax]}>Tax</Text>
          <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
        </View>

        {/* Table Rows */}
        {items.map((item, index) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
            <Text style={[styles.tableCell, styles.colItem, { fontWeight: 600 }]}>{item.description}</Text>
            <Text style={[styles.tableCell, styles.colHsn]}>{item.hsn || '-'}</Text>
            <Text style={[styles.tableCell, styles.colQty]}>{item.qty}</Text>
            <Text style={[styles.tableCell, styles.colRate]}>{formatCurrency(item.rate, totals.currency)}</Text>
            <Text style={[styles.tableCell, styles.colTax]}>{item.taxPercent}%</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>{formatCurrency(item.total, totals.currency)}</Text>
          </View>
        ))}
      </View>

      {/* Summary Section */}
      <View style={styles.summaryBlock} wrap={false}>
        <View style={styles.bankDetails}>
          {company.bankDetails ? (
            <>
              <Text style={styles.bankHeading}>Payment Details</Text>
              <Text style={styles.bankText}>{company.bankDetails}</Text>
            </>
          ) : <Text></Text>}
        </View>
        <View style={styles.totalsTable}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(totals.subTotal, totals.currency)}</Text>
          </View>
          
          {(totals.cgstAmount || 0) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>CGST:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totals.cgstAmount || 0, totals.currency)}</Text>
            </View>
          )}
          {(totals.sgstAmount || 0) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>SGST:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totals.sgstAmount || 0, totals.currency)}</Text>
            </View>
          )}
          {(totals.igstAmount || 0) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IGST:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totals.igstAmount || 0, totals.currency)}</Text>
            </View>
          )}
          
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total Tax:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(totals.taxTotal, totals.currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(totals.grandTotal, totals.currency)}</Text>
          </View>
          
          {totals.amountPaid !== undefined && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Amount Paid:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totals.amountPaid, totals.currency)}</Text>
            </View>
          )}
          {totals.balance !== undefined && (
            <View style={[styles.totalsRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.totalsLabel}>Balance Due:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totals.balance, totals.currency)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <View style={styles.termsSection}>
          <Text style={styles.termsHeading}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            {company.terms || '1. All payments are due within the specified terms.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.'}
          </Text>
        </View>
        <View style={styles.signatureSection}>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureText}>Authorized Signatory</Text>
            <Text style={[styles.signatureText, { fontWeight: 700, color: '#0f172a' }]}>{company.name}</Text>
          </View>
        </View>
      </View>
      
      {/* Page Numbers & Footer Branding */}
      <View style={{ position: 'absolute', bottom: 15, left: 30, right: 30, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 }} fixed>
        <Text style={{ fontSize: 8, color: '#94a3b8', fontStyle: 'italic' }}>
          Generated via Bill Aura Accounting Platform
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} />
      </View>
    </Page>
  </Document>
);
