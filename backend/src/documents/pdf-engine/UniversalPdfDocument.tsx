import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { PdfDocumentData } from './pdf-document.types';

const fmt = (num: any): string => {
  const n = Number(num);
  return isNaN(n) ? '0.00' : n.toFixed(2);
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    marginBottom: 16,
  },
  companyCol: {
    maxWidth: '55%',
  },
  logo: {
    maxHeight: 45,
    maxWidth: 160,
    objectFit: 'contain',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 3,
  },
  companyText: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 1.5,
  },
  docMetaCol: {
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  docMetaText: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 1.5,
  },
  disclaimer: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 3,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    marginBottom: 16,
  },
  detailsCol: {
    width: '48%',
  },
  detailsHeading: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#64748b',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 3,
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 9,
    color: '#1e293b',
    marginBottom: 1.5,
  },
  boldText: {
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1.5,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colIndex: { width: '6%' },
  colDesc: { width: '42%' },
  colQty: { width: '12%', textAlign: 'right' },
  colRate: { width: '15%', textAlign: 'right' },
  colTax: { width: '12%', textAlign: 'right' },
  colTotal: { width: '13%', textAlign: 'right' },
  thText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  tdText: {
    fontSize: 9,
    color: '#334155',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  summaryTable: {
    width: 240,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#0f172a',
    borderTopStyle: 'solid',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    borderBottomStyle: 'solid',
    marginTop: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 9,
    color: '#0f172a',
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  notesBlock: {
    padding: 10,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
    borderLeftStyle: 'solid',
    borderRadius: 4,
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
});

export const UniversalPdfDocument: React.FC<{ data: PdfDocumentData }> = ({ data }) => {
  const company = data?.company || {};
  const customer = data?.customer || {};
  const document = data?.document || {};
  const items = data?.items || [];
  const totals = data?.totals || {};
  const currency = totals.currency || '₹';

  const isReceipt = ['FEE_RECEIPT', 'PAYMENT_RECEIPT', 'OTHER_RECEIPT'].includes(document.docType || '');
  const isQuotation = ['QUOTATION', 'ESTIMATE', 'PROFORMA_INVOICE'].includes(document.docType || '');
  const isBillOfSupply = document.docType === 'BILL_OF_SUPPLY';
  const hasTax =
    Number(totals.taxTotal || 0) > 0 ||
    Number(totals.cgstAmount || 0) > 0 ||
    Number(totals.sgstAmount || 0) > 0 ||
    Number(totals.igstAmount || 0) > 0;


  const isValidLogo = !!(
    company.logoUrl &&
    typeof company.logoUrl === 'string' &&
    (company.logoUrl.startsWith('data:image/') ||
     company.logoUrl.startsWith('http://') ||
     company.logoUrl.startsWith('https://'))
  );

  return (
    <Document title={`${document.title || 'Document'} - ${document.documentNo || '001'}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.companyCol}>
            {isValidLogo ? (
              <Image src={company.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{company.name || 'BILL AURA ERP'}</Text>
            )}
            {isValidLogo && company.name ? (
              <Text style={[styles.companyText, styles.boldText]}>{company.name}</Text>
            ) : null}
            {company.address ? <Text style={styles.companyText}>{company.address}</Text> : null}
            {company.gstin ? <Text style={styles.companyText}>GSTIN: {company.gstin}</Text> : null}
            {company.pan ? <Text style={styles.companyText}>PAN: {company.pan}</Text> : null}
            {company.email ? <Text style={styles.companyText}>Email: {company.email}</Text> : null}
            {company.phone ? <Text style={styles.companyText}>Phone: {company.phone}</Text> : null}
          </View>

          <View style={styles.docMetaCol}>
            <Text style={styles.docTitle}>{document.title || 'DOCUMENT'}</Text>
            <Text style={styles.docMetaText}>
              <Text style={styles.boldText}>Doc No: </Text>{document.documentNo || '-'}
            </Text>
            <Text style={styles.docMetaText}>
              <Text style={styles.boldText}>Date: </Text>{document.date || '-'}
            </Text>
            {document.dueDate ? (
              <Text style={styles.docMetaText}>
                <Text style={styles.boldText}>Due Date: </Text>{document.dueDate}
              </Text>
            ) : null}
            {isBillOfSupply ? (
              <Text style={styles.disclaimer}>Composition / Exempt Supply - Not Eligible to Collect Tax</Text>
            ) : null}
            {isQuotation ? (
              <Text style={styles.disclaimer}>Commercial Proposal (Non-Accounting Document)</Text>
            ) : null}
          </View>
        </View>

        {/* PARTY DETAILS GRID */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailsCol}>
            <Text style={styles.detailsHeading}>
              {isReceipt ? 'Received From (Payer)' : 'Billed To (Client)'}
            </Text>
            <Text style={[styles.detailsText, styles.boldText]}>{customer.name || 'Customer'}</Text>
            {customer.address ? <Text style={styles.detailsText}>{customer.address}</Text> : null}
            {customer.gstin ? <Text style={styles.detailsText}>GSTIN: {customer.gstin}</Text> : null}
            {customer.email ? <Text style={styles.detailsText}>Email: {customer.email}</Text> : null}
            {customer.phone ? <Text style={styles.detailsText}>Phone: {customer.phone}</Text> : null}
          </View>

          <View style={styles.detailsCol}>
            <Text style={styles.detailsHeading}>Transaction Summary</Text>
            <Text style={styles.detailsText}>
              <Text style={styles.boldText}>Status: </Text>{document.status || 'SENT'}
            </Text>
            {document.paymentMode ? (
              <Text style={styles.detailsText}>
                <Text style={styles.boldText}>Payment Mode: </Text>{document.paymentMode}
              </Text>
            ) : null}
            {document.paymentReference ? (
              <Text style={styles.detailsText}>
                <Text style={styles.boldText}>Reference: </Text>{document.paymentReference}
              </Text>
            ) : null}
            {document.placeOfSupply ? (
              <Text style={styles.detailsText}>
                <Text style={styles.boldText}>Place of Supply: </Text>{document.placeOfSupply}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colIndex]}>#</Text>
            <Text style={[styles.thText, styles.colDesc]}>Item & Description</Text>
            <Text style={[styles.thText, styles.colQty]}>Qty</Text>
            <Text style={[styles.thText, styles.colRate]}>Rate ({currency})</Text>
            {hasTax ? <Text style={[styles.thText, styles.colTax]}>Tax ({currency})</Text> : null}
            <Text style={[styles.thText, styles.colTotal, !hasTax ? { width: '25%' } : {}]}>Total ({currency})</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdText, styles.colIndex]}>{idx + 1}</Text>
              <Text style={[styles.tdText, styles.colDesc]}>{item.description || 'Item'}</Text>
              <Text style={[styles.tdText, styles.colQty]}>{item.qty ?? 0}</Text>
              <Text style={[styles.tdText, styles.colRate]}>{fmt(item.rate)}</Text>
              {hasTax ? <Text style={[styles.tdText, styles.colTax]}>{fmt(item.taxAmount)}</Text> : null}
              <Text style={[styles.tdText, styles.colTotal, !hasTax ? { width: '25%' } : {}]}>{fmt(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* SUMMARY & TOTALS */}
        <View style={styles.summarySection} wrap={false}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{currency} {fmt(totals.subTotal)}</Text>
            </View>

            {totals.cgstAmount && Number(totals.cgstAmount) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.cgstAmount)}</Text>
              </View>
            ) : null}

            {totals.sgstAmount && Number(totals.sgstAmount) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.sgstAmount)}</Text>
              </View>
            ) : null}

            {totals.igstAmount && Number(totals.igstAmount) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IGST</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.igstAmount)}</Text>
              </View>
            ) : null}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>{currency} {fmt(totals.grandTotal)}</Text>
            </View>

            {totals.amountPaid && Number(totals.amountPaid) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount Paid</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.amountPaid)}</Text>
              </View>
            ) : null}

            {totals.balanceDue && Number(totals.balanceDue) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.boldText]}>Balance Due</Text>
                <Text style={[styles.summaryValue, styles.boldText]}>{currency} {fmt(totals.balanceDue)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* NOTES & TERMS */}
        {(company.bankDetails || company.terms) ? (
          <View style={styles.notesBlock} wrap={false}>
            {company.bankDetails ? (
              <Text style={styles.companyText}>
                <Text style={styles.boldText}>Bank Details: </Text>{company.bankDetails}
              </Text>
            ) : null}
            {company.terms ? (
              <Text style={styles.companyText}>
                <Text style={styles.boldText}>Terms & Conditions: </Text>{company.terms}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* FOOTER */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `This is an official computer-generated document. Generated by ${company.name || 'Bill Aura ERP'}. Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
