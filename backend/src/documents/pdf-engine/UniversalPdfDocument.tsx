import React from 'react';
import { PdfDocumentData } from './pdf-document.types';

export interface ReactPdfModule {
  Document: any;
  Page: any;
  Text: any;
  View: any;
  StyleSheet: any;
  Image: any;
  [key: string]: any;
}

const fmt = (num: any): string => {
  const n = Number(num);
  return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

let cachedStyles: any = null;
const getStyles = (StyleSheet: any) => {
  if (cachedStyles) return cachedStyles;
  cachedStyles = StyleSheet.create({
    page: {
      paddingTop: 28,
      paddingBottom: 45,
      paddingHorizontal: 28,
      fontFamily: 'Helvetica',
      fontSize: 8.5,
      color: '#1e293b',
      backgroundColor: '#ffffff',
    },
    // Watermark
    watermarkContainer: {
      position: 'absolute',
      top: '40%',
      left: '20%',
      right: '20%',
      transform: 'rotate(-30deg)',
      opacity: 0.08,
      textAlign: 'center',
    },
    watermarkText: {
      fontSize: 64,
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
    },
    // Header
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 1.5,
      borderBottomColor: '#0f172a',
      borderBottomStyle: 'solid',
      paddingBottom: 10,
      marginBottom: 12,
    },
    companyCol: {
      width: '58%',
    },
    logo: {
      maxHeight: 45,
      maxWidth: 160,
      objectFit: 'contain',
      marginBottom: 6,
    },
    companyName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#0f172a',
      marginBottom: 3,
    },
    companySubText: {
      fontSize: 8,
      color: '#475569',
      marginBottom: 1.5,
      lineHeight: 1.3,
    },
    metaCol: {
      width: '38%',
      textAlign: 'right',
    },
    docTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1e3a8a',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    docBadge: {
      fontSize: 7.5,
      color: '#64748b',
      marginBottom: 4,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 2,
    },
    metaLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#334155',
    },
    metaValue: {
      fontSize: 8,
      color: '#0f172a',
      marginLeft: 4,
    },
    // Parties Section
    partiesContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 4,
      backgroundColor: '#f8fafc',
      marginBottom: 12,
    },
    partyCol: {
      width: '50%',
      padding: 8,
    },
    partyBorderRight: {
      borderRightWidth: 1,
      borderRightColor: '#cbd5e1',
    },
    partyTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#475569',
      borderBottomWidth: 0.5,
      borderBottomColor: '#cbd5e1',
      paddingBottom: 2,
      marginBottom: 4,
    },
    partyName: {
      fontSize: 9.5,
      fontWeight: 'bold',
      color: '#0f172a',
      marginBottom: 2,
    },
    partyText: {
      fontSize: 8,
      color: '#334155',
      marginBottom: 1.5,
      lineHeight: 1.25,
    },
    // Line Items Table
    table: {
      width: '100%',
      marginBottom: 10,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#1e293b',
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    thText: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: '#ffffff',
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0',
      borderBottomStyle: 'solid',
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    tableRowEven: {
      backgroundColor: '#f8fafc',
    },
    tdText: {
      fontSize: 8,
      color: '#1e293b',
    },
    colIndex: { width: '5%', textAlign: 'center' },
    colDesc: { width: '37%' },
    colHsn: { width: '13%', textAlign: 'center' },
    colQty: { width: '9%', textAlign: 'right' },
    colRate: { width: '12%', textAlign: 'right' },
    colTax: { width: '10%', textAlign: 'right' },
    colTotal: { width: '14%', textAlign: 'right' },
    // Summary & Totals
    totalsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    wordsAndNotesCol: {
      width: '54%',
    },
    amountWordsBox: {
      padding: 6,
      backgroundColor: '#f1f5f9',
      borderRadius: 3,
      borderLeftWidth: 3,
      borderLeftColor: '#1e3a8a',
      marginBottom: 8,
    },
    amountWordsLabel: {
      fontSize: 7,
      fontWeight: 'bold',
      color: '#475569',
      textTransform: 'uppercase',
      marginBottom: 1.5,
    },
    amountWordsText: {
      fontSize: 8,
      color: '#0f172a',
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
    bankDetailsBox: {
      padding: 6,
      borderWidth: 0.5,
      borderColor: '#cbd5e1',
      borderRadius: 3,
      backgroundColor: '#ffffff',
      marginBottom: 6,
    },
    bankTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: '#1e293b',
      textTransform: 'uppercase',
      borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 2,
      marginBottom: 3,
    },
    bankText: {
      fontSize: 7.5,
      color: '#334155',
      marginBottom: 1,
    },
    summaryCol: {
      width: '42%',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2.5,
      paddingHorizontal: 4,
    },
    summaryLabel: {
      fontSize: 8,
      color: '#475569',
    },
    summaryValue: {
      fontSize: 8,
      color: '#0f172a',
      textAlign: 'right',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4.5,
      paddingHorizontal: 4,
      borderTopWidth: 1.5,
      borderTopColor: '#0f172a',
      borderBottomWidth: 1.5,
      borderBottomColor: '#0f172a',
      backgroundColor: '#f8fafc',
      marginTop: 2,
      marginBottom: 2,
    },
    grandTotalLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#0f172a',
    },
    grandTotalValue: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#0f172a',
      textAlign: 'right',
    },
    // Tax Breakup Table
    taxBreakupSection: {
      marginBottom: 10,
    },
    taxBreakupTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: '#475569',
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    taxTable: {
      width: '100%',
      borderWidth: 0.5,
      borderColor: '#cbd5e1',
    },
    taxHeader: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      borderBottomWidth: 0.5,
      borderBottomColor: '#cbd5e1',
      paddingVertical: 3,
      paddingHorizontal: 4,
    },
    taxRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#f1f5f9',
      paddingVertical: 2.5,
      paddingHorizontal: 4,
    },
    thTaxText: {
      fontSize: 6.5,
      fontWeight: 'bold',
      color: '#334155',
      textAlign: 'right',
    },
    tdTaxText: {
      fontSize: 7,
      color: '#1e293b',
      textAlign: 'right',
    },
    colTaxHsn: { width: '18%', textAlign: 'left' },
    colTaxVal: { width: '22%' },
    colTaxRate: { width: '15%' },
    colTaxCgst: { width: '15%' },
    colTaxSgst: { width: '15%' },
    colTaxIgst: { width: '15%' },
    colTaxTotal: { width: '15%' },
    // Terms & Signatory Section
    bottomSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: '#cbd5e1',
      paddingTop: 8,
      marginTop: 4,
    },
    termsCol: {
      width: '58%',
    },
    termsTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: '#334155',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    termsText: {
      fontSize: 7,
      color: '#64748b',
      lineHeight: 1.3,
    },
    signatoryCol: {
      width: '38%',
      textAlign: 'right',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      paddingTop: 20,
    },
    signatoryCompany: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#0f172a',
      marginBottom: 35,
    },
    signatoryLine: {
      borderTopWidth: 0.5,
      borderTopColor: '#475569',
      width: 140,
      textAlign: 'center',
      paddingTop: 3,
    },
    signatoryLabel: {
      fontSize: 7.5,
      color: '#475569',
    },
    // Footer
    pageFooter: {
      position: 'absolute',
      bottom: 16,
      left: 28,
      right: 28,
      textAlign: 'center',
      fontSize: 7,
      color: '#94a3b8',
      borderTopWidth: 0.5,
      borderTopColor: '#e2e8f0',
      paddingTop: 4,
    },
  });
  return cachedStyles;
};

export const UniversalPdfDocument: React.FC<{ data: PdfDocumentData; pdf?: ReactPdfModule }> = ({ data, pdf }) => {
  if (!pdf) {
    throw new Error('UniversalPdfDocument: "pdf" module must be passed to render UniversalPdfDocument.');
  }

  const { Document, Page, Text, View, Image, StyleSheet } = pdf;
  const styles = getStyles(StyleSheet);

  const company = data?.company || {};
  const customer = data?.customer || {};
  const document = data?.document || {};
  const items = data?.items || [];
  const totals = data?.totals || {};
  const taxBreakup = data?.taxBreakup || [];
  const currency = totals.currency || '₹';

  const isReceipt = document.docType === 'PAYMENT_RECEIPT' || document.docType === 'FEE_RECEIPT';
  const isBillOfSupply = document.docType === 'BILL_OF_SUPPLY';
  const isInterstate = Number(totals.igstAmount || 0) > 0;

  const template = (data as any).template;
  const logoSettings = template?.logoSettings || {};
  const logoPos = logoSettings.position || 'left';
  const logoWidth = logoSettings.width ? Math.min(240, Math.max(40, Number(logoSettings.width))) : 140;
  const showLogo = logoSettings.showLogo !== false;

  const isValidLogo = !!(
    showLogo &&
    company.logoUrl &&
    typeof company.logoUrl === 'string' &&
    (company.logoUrl.startsWith('data:image/') ||
      company.logoUrl.startsWith('http://') ||
      company.logoUrl.startsWith('https://'))
  );

  const primaryColor = template?.colors?.primary || '#1e3a8a';

  if (
    template?.theme === 'spreadsheet' ||
    template?.name === 'Spreadsheet Template' ||
    document.docType === 'QUOTE'
  ) {
    const isInterstateQuote = Number(totals.igstAmount || 0) > 0;
    const hasHsn = items.some((it) => !!it.hsn);

    const ssStyles = StyleSheet.create({
      page: {
        padding: 34,
        fontFamily: 'Times-Roman',
        fontSize: 8.5,
        color: '#000000',
        backgroundColor: '#ffffff',
      },
      outerBox: {
        borderWidth: 1,
        borderColor: '#000000',
        borderStyle: 'solid',
        width: '100%',
      },
      headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
      },
      logoCell: {
        width: '28%',
        borderRightWidth: 1,
        borderRightColor: '#000000',
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
      },
      companyCell: {
        width: '72%',
        padding: 8,
        justifyContent: 'space-between',
      },
      companyName: {
        fontFamily: 'Times-Bold',
        fontSize: 14,
        textTransform: 'uppercase',
        marginBottom: 2,
      },
      companyAddress: {
        fontSize: 8,
        lineHeight: 1.25,
      },
      docTitle: {
        fontSize: 20,
        fontFamily: 'Times-Roman',
        textAlign: 'right',
        marginTop: 6,
      },
      metaRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
      },
      metaCellLeft: {
        width: '50%',
        borderRightWidth: 1,
        borderRightColor: '#000000',
        padding: 6,
      },
      metaCellRight: {
        width: '50%',
        padding: 6,
      },
      metaItem: {
        flexDirection: 'row',
        marginBottom: 2,
        fontSize: 8,
      },
      metaLabel: {
        width: 80,
        fontSize: 7.5,
      },
      metaValue: {
        fontFamily: 'Times-Bold',
      },
      partiesRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
      },
      partyColLeft: {
        width: '50%',
        borderRightWidth: 1,
        borderRightColor: '#000000',
      },
      partyColRight: {
        width: '50%',
      },
      partyHeaderStrip: {
        backgroundColor: '#d9d9d9',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        fontFamily: 'Times-Bold',
        fontSize: 8.5,
      },
      partyBody: {
        padding: 6,
        fontSize: 8,
        lineHeight: 1.25,
      },
      partyNameBlue: {
        fontFamily: 'Times-Bold',
        color: '#2563eb',
        fontSize: 9,
        marginBottom: 2,
      },
      partyNameBlack: {
        fontFamily: 'Times-Bold',
        color: '#000000',
        fontSize: 9,
        marginBottom: 2,
      },
      tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#d9d9d9',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        fontFamily: 'Times-Bold',
        fontSize: 8,
      },
      thCell: {
        borderRightWidth: 1,
        borderRightColor: '#000000',
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
      },
      tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        fontSize: 8,
      },
      tdCell: {
        borderRightWidth: 1,
        borderRightColor: '#000000',
        padding: 3,
      },
      footerRow: {
        flexDirection: 'row',
      },
      footerLeft: {
        width: '62%',
        borderRightWidth: 1,
        borderRightColor: '#000000',
        padding: 6,
      },
      footerRight: {
        width: '38%',
        justifyContent: 'space-between',
      },
      totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        fontSize: 8.5,
      },
      signatureBox: {
        height: 100,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 6,
      },
      signatureLabel: {
        fontSize: 7.5,
        color: '#4b5563',
      },
    });

    return (
      <Document title={`Quote - ${document.documentNo || 'Doc'}`}>
        <Page size="A4" style={ssStyles.page}>
          <View style={ssStyles.outerBox}>
            {/* Block 1: Header */}
            <View style={ssStyles.headerRow}>
              <View style={ssStyles.logoCell}>
                {isValidLogo ? (
                  <Image src={company.logoUrl} style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain' }} />
                ) : (
                  <Text style={{ fontFamily: 'Times-Bold', fontSize: 13, textAlign: 'center' }}>
                    {company.name || 'COMPANY LOGO'}
                  </Text>
                )}
              </View>
              <View style={ssStyles.companyCell}>
                <View>
                  <Text style={ssStyles.companyName}>{company.name || 'BIOFIX TECHNOLOGY LLP'}</Text>
                  {company.address ? <Text style={ssStyles.companyAddress}>{company.address}</Text> : null}
                  {company.gstin ? <Text style={ssStyles.companyAddress}>GSTIN {company.gstin}</Text> : null}
                  {company.phone ? <Text style={ssStyles.companyAddress}>{company.phone}</Text> : null}
                  {company.email ? <Text style={ssStyles.companyAddress}>{company.email}</Text> : null}
                </View>
                <Text style={ssStyles.docTitle}>Quote</Text>
              </View>
            </View>

            {/* Block 2: Meta Row */}
            <View style={ssStyles.metaRow}>
              <View style={ssStyles.metaCellLeft}>
                <View style={ssStyles.metaItem}>
                  <Text style={ssStyles.metaLabel}>Quote No</Text>
                  <Text style={ssStyles.metaValue}>: {document.documentNo || 'QT-000022'}</Text>
                </View>
                <View style={ssStyles.metaItem}>
                  <Text style={ssStyles.metaLabel}>Quote Date</Text>
                  <Text style={ssStyles.metaValue}>: {document.date || '13/04/2026'}</Text>
                </View>
                <View style={ssStyles.metaItem}>
                  <Text style={ssStyles.metaLabel}>Expiry Date</Text>
                  <Text style={ssStyles.metaValue}>: {document.expiryDate || document.dueDate || '20/04/2026'}</Text>
                </View>
              </View>
              <View style={ssStyles.metaCellRight}>
                <View style={ssStyles.metaItem}>
                  <Text style={{ width: 95, fontSize: 7.5 }}>Place Of Supply</Text>
                  <Text style={ssStyles.metaValue}>: {document.placeOfSupply || company.state || 'Kerala (32)'}</Text>
                </View>
                <View style={ssStyles.metaItem}>
                  <Text style={{ width: 95, fontSize: 7.5 }}>Sales person</Text>
                  <Text style={ssStyles.metaValue}>: {document.salesperson || 'PAVITHRA'}</Text>
                </View>
              </View>
            </View>

            {/* Block 3: Bill To / Ship To */}
            <View style={ssStyles.partiesRow}>
              <View style={ssStyles.partyColLeft}>
                <Text style={ssStyles.partyHeaderStrip}>Bill To</Text>
                <View style={ssStyles.partyBody}>
                  <Text style={ssStyles.partyNameBlue}>{customer.name || 'Customer Name'}</Text>
                  {customer.address ? <Text>{customer.address}</Text> : null}
                  {customer.gstin ? <Text>GSTIN {customer.gstin}</Text> : null}
                </View>
              </View>
              <View style={ssStyles.partyColRight}>
                <Text style={ssStyles.partyHeaderStrip}>Ship To</Text>
                <View style={ssStyles.partyBody}>
                  <Text style={ssStyles.partyNameBlack}>{customer.name || 'Customer Name'}</Text>
                  {customer.shippingAddress || customer.address ? (
                    <Text>{customer.shippingAddress || customer.address}</Text>
                  ) : null}
                  {customer.gstin ? <Text>GSTIN {customer.gstin}</Text> : null}
                </View>
              </View>
            </View>

            {/* Block 4: Items Table */}
            <View>
              <View style={ssStyles.tableHeaderRow}>
                <Text style={[ssStyles.thCell, { width: '5%' }]}>#</Text>
                <Text style={[ssStyles.thCell, { width: '38%', textAlign: 'left', alignItems: 'flex-start' }]}>Item & Description</Text>
                {hasHsn ? <Text style={[ssStyles.thCell, { width: '12%' }]}>HSN/SAC</Text> : null}
                <Text style={[ssStyles.thCell, { width: '9%' }]}>Qty</Text>
                <Text style={[ssStyles.thCell, { width: '11%' }]}>Rate</Text>
                {!isInterstateQuote ? (
                  <>
                    <Text style={[ssStyles.thCell, { width: '6%' }]}>CGST%</Text>
                    <Text style={[ssStyles.thCell, { width: '7%' }]}>CGST Amt</Text>
                    <Text style={[ssStyles.thCell, { width: '6%' }]}>SGST%</Text>
                    <Text style={[ssStyles.thCell, { width: '7%' }]}>SGST Amt</Text>
                  </>
                ) : (
                  <>
                    <Text style={[ssStyles.thCell, { width: '10%' }]}>IGST%</Text>
                    <Text style={[ssStyles.thCell, { width: '12%' }]}>IGST Amt</Text>
                  </>
                )}
                <Text style={[ssStyles.thCell, { width: '15%', borderRightWidth: 0 }]}>Amount</Text>
              </View>

              {items.map((it: any, idx: number) => {
                const qty = Number(it.qty || 1);
                const rate = Number(it.rate || 0);
                const taxable = qty * rate;
                const taxP = Number(it.taxPercent || 0);
                const halfP = taxP / 2;
                const cgstA = Number(it.cgstAmount || (taxable * halfP) / 100);
                const sgstA = Number(it.sgstAmount || (taxable * halfP) / 100);
                const igstA = Number(it.igstAmount || (taxable * taxP) / 100);

                return (
                  <View key={idx} style={ssStyles.tableRow}>
                    <Text style={[ssStyles.tdCell, { width: '5%', textAlign: 'center' }]}>{idx + 1}</Text>
                    <View style={[ssStyles.tdCell, { width: '38%' }]}>
                      <Text style={{ fontFamily: 'Times-Bold' }}>{it.description || 'Item'}</Text>
                    </View>
                    {hasHsn ? <Text style={[ssStyles.tdCell, { width: '12%', textAlign: 'center' }]}>{it.hsn || '—'}</Text> : null}
                    <View style={[ssStyles.tdCell, { width: '9%', alignItems: 'flex-end' }]}>
                      <Text>{fmt(qty)}</Text>
                      {it.unit ? <Text style={{ fontSize: 6.5, color: '#4b5563' }}>{it.unit}</Text> : null}
                    </View>
                    <Text style={[ssStyles.tdCell, { width: '11%', textAlign: 'right' }]}>{fmt(rate)}</Text>
                    {!isInterstateQuote ? (
                      <>
                        <Text style={[ssStyles.tdCell, { width: '6%', textAlign: 'center' }]}>{halfP}%</Text>
                        <Text style={[ssStyles.tdCell, { width: '7%', textAlign: 'right' }]}>{fmt(cgstA)}</Text>
                        <Text style={[ssStyles.tdCell, { width: '6%', textAlign: 'center' }]}>{halfP}%</Text>
                        <Text style={[ssStyles.tdCell, { width: '7%', textAlign: 'right' }]}>{fmt(sgstA)}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[ssStyles.tdCell, { width: '10%', textAlign: 'center' }]}>{taxP}%</Text>
                        <Text style={[ssStyles.tdCell, { width: '12%', textAlign: 'right' }]}>{fmt(igstA)}</Text>
                      </>
                    )}
                    <Text style={[ssStyles.tdCell, { width: '15%', textAlign: 'right', borderRightWidth: 0, fontFamily: 'Times-Bold' }]}>
                      {fmt(taxable)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Block 5: Footer Area */}
            <View style={ssStyles.footerRow}>
              <View style={ssStyles.footerLeft}>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 7, color: '#374151' }}>Total In Words</Text>
                  <Text style={{ fontFamily: 'Times-BoldItalic', fontSize: 8.5, marginTop: 1 }}>
                    {totals.amountInWords || 'Indian Rupee Zero Only'}
                  </Text>
                </View>

                {document.notes ? (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontFamily: 'Times-Bold', fontSize: 8 }}>Notes</Text>
                    <Text style={{ fontSize: 7.5, marginTop: 1 }}>{document.notes}</Text>
                  </View>
                ) : null}

                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontFamily: 'Times-Bold', fontSize: 7.5, textTransform: 'uppercase' }}>
                    {company.name || 'BIOFIX TECHNOLOGY'}
                  </Text>
                  <Text style={{ fontSize: 7.5 }}>
                    ACCOUNT NUMBER : {company.bankInfo?.accountNumber || '2510201002100'}
                  </Text>
                  <Text style={{ fontSize: 7.5 }}>{company.bankInfo?.bankName || 'FEDERAL BANK'}</Text>
                  <Text style={{ fontSize: 7.5 }}>IFSC : {company.bankInfo?.ifsc || 'FDRL0002510'}</Text>
                  <Text style={{ fontSize: 7.5 }}>{company.bankInfo?.branch || 'KONDOTTY'} BRANCH</Text>
                </View>

                {document.terms ? (
                  <View>
                    <Text style={{ fontFamily: 'Times-Bold', fontSize: 8 }}>Terms & Conditions</Text>
                    <Text style={{ fontSize: 7.5, marginTop: 1 }}>{document.terms}</Text>
                  </View>
                ) : null}
              </View>

              <View style={ssStyles.footerRight}>
                <View>
                  <View style={ssStyles.totalsRow}>
                    <Text>Sub Total</Text>
                    <Text style={{ fontFamily: 'Times-Bold' }}>{fmt(totals.subTotal)}</Text>
                  </View>
                  {!isInterstateQuote ? (
                    <>
                      <View style={ssStyles.totalsRow}>
                        <Text>CGST9 (9%)</Text>
                        <Text>{fmt(totals.cgstAmount || 0)}</Text>
                      </View>
                      <View style={ssStyles.totalsRow}>
                        <Text>SGST9 (9%)</Text>
                        <Text>{fmt(totals.sgstAmount || 0)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={ssStyles.totalsRow}>
                      <Text>IGST (18%)</Text>
                      <Text>{fmt(totals.igstAmount || 0)}</Text>
                    </View>
                  )}
                  <View style={[ssStyles.totalsRow, { fontFamily: 'Times-Bold', fontSize: 9.5 }]}>
                    <Text>Total</Text>
                    <Text>{currency}{fmt(totals.grandTotal)}</Text>
                  </View>
                </View>

                <View style={ssStyles.signatureBox}>
                  <Text style={ssStyles.signatureLabel}>Authorized Signature</Text>
                </View>
              </View>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document title={`${document.title || 'Invoice'} - ${document.documentNo || 'Doc'}`}>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        {document.watermark ? (
          <View style={styles.watermarkContainer}>
            <Text style={styles.watermarkText}>{document.watermark}</Text>
          </View>
        ) : null}

        {/* Centered Logo if position is center */}
        {isValidLogo && logoPos === 'center' ? (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Image src={company.logoUrl} style={{ maxHeight: 60, maxWidth: logoWidth, objectFit: 'contain' }} />
          </View>
        ) : null}

        {/* 1. Header (Company Info & Document Meta) */}
        <View style={[styles.headerContainer, { borderBottomColor: primaryColor }]}>
          <View style={styles.companyCol}>
            {isValidLogo && logoPos === 'left' ? (
              <Image src={company.logoUrl} style={[styles.logo, { maxWidth: logoWidth }]} />
            ) : null}
            <Text style={styles.companyName}>{company.name || 'BILL AURA ERP'}</Text>
            {company.address ? <Text style={styles.companySubText}>{company.address}</Text> : null}
            {company.gstin ? (
              <Text style={styles.companySubText}>
                <Text style={{ fontWeight: 'bold' }}>GSTIN: </Text>{company.gstin}
              </Text>
            ) : null}
            {company.pan ? (
              <Text style={styles.companySubText}>
                <Text style={{ fontWeight: 'bold' }}>PAN: </Text>{company.pan}
              </Text>
            ) : null}
            {company.phone || company.email ? (
              <Text style={styles.companySubText}>
                {company.phone ? `Phone: ${company.phone}  ` : ''}
                {company.email ? `Email: ${company.email}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={styles.metaCol}>
            {isValidLogo && logoPos === 'right' ? (
              <View style={{ alignItems: 'flex-end', marginBottom: 6 }}>
                <Image src={company.logoUrl} style={[styles.logo, { maxWidth: logoWidth }]} />
              </View>
            ) : null}
            <Text style={[styles.docTitle, { color: primaryColor }]}>{document.title || 'TAX INVOICE'}</Text>
            {isBillOfSupply ? (
              <Text style={styles.docBadge}>(Composition Supply - Not Eligible to Collect Tax)</Text>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={[styles.metaValue, { fontWeight: 'bold' }]}>{document.documentNo}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Date:</Text>
              <Text style={styles.metaValue}>{document.date}</Text>
            </View>

            {document.dueDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date:</Text>
                <Text style={styles.metaValue}>{document.dueDate}</Text>
              </View>
            ) : null}

            {document.placeOfSupply ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Place of Supply:</Text>
                <Text style={styles.metaValue}>{document.placeOfSupply}</Text>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Reverse Charge:</Text>
              <Text style={styles.metaValue}>{document.reverseCharge ? 'Yes' : 'No'}</Text>
            </View>

            {document.paymentMode ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Mode:</Text>
                <Text style={styles.metaValue}>{document.paymentMode}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 2. Parties Grid (Billed To & Shipped To) */}
        <View style={styles.partiesContainer}>
          <View style={[styles.partyCol, styles.partyBorderRight]}>
            <Text style={styles.partyTitle}>Billed To (Customer)</Text>
            <Text style={styles.partyName}>{customer.name || 'Cash Customer'}</Text>
            {customer.address ? <Text style={styles.partyText}>{customer.address}</Text> : null}
            {customer.gstin ? (
              <Text style={styles.partyText}>
                <Text style={{ fontWeight: 'bold' }}>GSTIN: </Text>{customer.gstin}
              </Text>
            ) : null}
            {customer.pan ? (
              <Text style={styles.partyText}>
                <Text style={{ fontWeight: 'bold' }}>PAN: </Text>{customer.pan}
              </Text>
            ) : null}
            {customer.phone || customer.email ? (
              <Text style={styles.partyText}>
                {customer.phone ? `Phone: ${customer.phone} ` : ''}
                {customer.email ? `Email: ${customer.email}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={styles.partyCol}>
            <Text style={styles.partyTitle}>Shipped To (Consignee)</Text>
            {customer.shippingAddress ? (
              <>
                <Text style={styles.partyName}>{customer.name || 'Customer'}</Text>
                <Text style={styles.partyText}>{customer.shippingAddress}</Text>
                {customer.gstin ? (
                  <Text style={styles.partyText}>
                    <Text style={{ fontWeight: 'bold' }}>GSTIN: </Text>{customer.gstin}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.partyText}>(Same as Billing Address)</Text>
                {customer.address ? <Text style={styles.partyText}>{customer.address}</Text> : null}
              </>
            )}
          </View>
        </View>

        {/* 3. Line Items Table with repeat header across pages */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.thText, styles.colIndex]}>#</Text>
            <Text style={[styles.thText, styles.colDesc]}>Item & Description</Text>
            <Text style={[styles.thText, styles.colHsn]}>HSN/SAC</Text>
            <Text style={[styles.thText, styles.colQty]}>Qty</Text>
            <Text style={[styles.thText, styles.colRate]}>Rate ({currency})</Text>
            <Text style={[styles.thText, styles.colTax]}>Tax ({currency})</Text>
            <Text style={[styles.thText, styles.colTotal]}>Amount ({currency})</Text>
          </View>

          {items.map((item, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <View
                key={idx}
                style={[styles.tableRow, isEven ? styles.tableRowEven : {}]}
                wrap={false}
              >
                <Text style={[styles.tdText, styles.colIndex]}>{idx + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={[styles.tdText, { fontWeight: 'bold' }]}>{item.description || 'Item'}</Text>
                </View>
                <Text style={[styles.tdText, styles.colHsn]}>{item.hsn || '-'}</Text>
                <Text style={[styles.tdText, styles.colQty]}>
                  {item.qty} {item.unit || ''}
                </Text>
                <Text style={[styles.tdText, styles.colRate]}>{fmt(item.rate)}</Text>
                <Text style={[styles.tdText, styles.colTax]}>
                  {fmt(item.taxAmount)}
                  {item.taxPercent ? ` (${item.taxPercent}%)` : ''}
                </Text>
                <Text style={[styles.tdText, styles.colTotal, { fontWeight: 'bold' }]}>
                  {fmt(item.total)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 4. Totals, Amount in Words & Bank Details */}
        <View style={styles.totalsContainer} wrap={false}>
          <View style={styles.wordsAndNotesCol}>
            {/* Amount in words */}
            {totals.amountInWords ? (
              <View style={styles.amountWordsBox}>
                <Text style={styles.amountWordsLabel}>Total Amount in Words</Text>
                <Text style={styles.amountWordsText}>{totals.amountInWords}</Text>
              </View>
            ) : null}

            {/* Bank details */}
            {(company.bankInfo || company.bankDetails) ? (
              <View style={styles.bankDetailsBox}>
                <Text style={styles.bankTitle}>Bank & Payment Details</Text>
                {company.bankInfo ? (
                  <>
                    {company.bankInfo.bankName ? (
                      <Text style={styles.bankText}>
                        <Text style={{ fontWeight: 'bold' }}>Bank: </Text>{company.bankInfo.bankName}
                      </Text>
                    ) : null}
                    {company.bankInfo.accountName ? (
                      <Text style={styles.bankText}>
                        <Text style={{ fontWeight: 'bold' }}>A/C Name: </Text>{company.bankInfo.accountName}
                      </Text>
                    ) : null}
                    {company.bankInfo.accountNumber ? (
                      <Text style={styles.bankText}>
                        <Text style={{ fontWeight: 'bold' }}>A/C No: </Text>{company.bankInfo.accountNumber}
                      </Text>
                    ) : null}
                    {company.bankInfo.ifsc ? (
                      <Text style={styles.bankText}>
                        <Text style={{ fontWeight: 'bold' }}>IFSC Code: </Text>{company.bankInfo.ifsc}
                      </Text>
                    ) : null}
                    {company.bankInfo.upiId ? (
                      <Text style={styles.bankText}>
                        <Text style={{ fontWeight: 'bold' }}>UPI ID: </Text>{company.bankInfo.upiId}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.bankText}>{company.bankDetails}</Text>
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.summaryCol}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sub Total (Taxable)</Text>
              <Text style={styles.summaryValue}>{currency} {fmt(totals.subTotal)}</Text>
            </View>

            {totals.cgstAmount ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.cgstAmount)}</Text>
              </View>
            ) : null}

            {totals.sgstAmount ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.sgstAmount)}</Text>
              </View>
            ) : null}

            {totals.igstAmount ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IGST</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.igstAmount)}</Text>
              </View>
            ) : null}

            {totals.cessAmount ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cess</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.cessAmount)}</Text>
              </View>
            ) : null}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{currency} {fmt(totals.grandTotal)}</Text>
            </View>

            {totals.amountPaid && Number(totals.amountPaid) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount Paid</Text>
                <Text style={styles.summaryValue}>{currency} {fmt(totals.amountPaid)}</Text>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: 'bold', color: '#0f172a' }]}>Balance Due</Text>
              <Text style={[styles.summaryValue, { fontWeight: 'bold', color: '#0f172a' }]}>
                {currency} {fmt(totals.balanceDue ?? (totals.grandTotal - (totals.amountPaid || 0)))}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Tax Breakup Table (if GST breakdown is present) */}
        {taxBreakup.length > 0 ? (
          <View style={styles.taxBreakupSection} wrap={false}>
            <Text style={styles.taxBreakupTitle}>GST Tax Breakdown Summary</Text>
            <View style={styles.taxTable}>
              <View style={styles.taxHeader}>
                <Text style={[styles.thTaxText, styles.colTaxHsn]}>HSN/SAC</Text>
                <Text style={[styles.thTaxText, styles.colTaxVal]}>Taxable Amt ({currency})</Text>
                {!isInterstate ? (
                  <>
                    <Text style={[styles.thTaxText, styles.colTaxCgst]}>CGST ({currency})</Text>
                    <Text style={[styles.thTaxText, styles.colTaxSgst]}>SGST ({currency})</Text>
                  </>
                ) : (
                  <Text style={[styles.thTaxText, styles.colTaxIgst]}>IGST ({currency})</Text>
                )}
                <Text style={[styles.thTaxText, styles.colTaxTotal]}>Total Tax ({currency})</Text>
              </View>

              {taxBreakup.map((row, idx) => (
                <View key={idx} style={styles.taxRow}>
                  <Text style={[styles.tdTaxText, styles.colTaxHsn]}>{row.hsn}</Text>
                  <Text style={[styles.tdTaxText, styles.colTaxVal]}>{fmt(row.taxableAmount)}</Text>
                  {!isInterstate ? (
                    <>
                      <Text style={[styles.tdTaxText, styles.colTaxCgst]}>
                        {fmt(row.cgstAmount)} {row.cgstRate ? `(${row.cgstRate}%)` : ''}
                      </Text>
                      <Text style={[styles.tdTaxText, styles.colTaxSgst]}>
                        {fmt(row.sgstAmount)} {row.sgstRate ? `(${row.sgstRate}%)` : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.tdTaxText, styles.colTaxIgst]}>
                      {fmt(row.igstAmount)} {row.igstRate ? `(${row.igstRate}%)` : ''}
                    </Text>
                  )}
                  <Text style={[styles.tdTaxText, styles.colTaxTotal, { fontWeight: 'bold' }]}>
                    {fmt(row.totalTax)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 6. Terms & Conditions and Authorized Signatory */}
        <View style={styles.bottomSection} wrap={false}>
          <View style={styles.termsCol}>
            {document.notes ? (
              <View style={{ marginBottom: 4 }}>
                <Text style={styles.termsTitle}>Notes:</Text>
                <Text style={styles.termsText}>{document.notes}</Text>
              </View>
            ) : null}
            <Text style={styles.termsTitle}>Terms & Conditions:</Text>
            <Text style={styles.termsText}>
              {document.terms || company.terms || '1. Goods once sold will not be taken back or exchanged.\n2. Payment is due within the stipulated due date.'}
            </Text>
          </View>

          <View style={styles.signatoryCol}>
            <Text style={styles.signatoryCompany}>For {company.name || 'Company'}</Text>
            <View style={styles.signatoryLine}>
              <Text style={styles.signatoryLabel}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

        {/* 7. Fixed Footer */}
        <Text
          style={styles.pageFooter}
          render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `This is a computer generated invoice. ${company.name || 'Bill Aura ERP'} | Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
