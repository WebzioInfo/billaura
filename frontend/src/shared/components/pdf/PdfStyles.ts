import { StyleSheet, Font } from '@react-pdf/renderer';

// Register standard fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2', fontWeight: 700 }
  ]
});

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    padding: 30,
    backgroundColor: '#ffffff',
    color: '#1e293b' // slate-800
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15
  },
  logoBlock: {
    flex: 1
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain'
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    marginTop: 10
  },
  companyAddress: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 1.4
  },
  documentMeta: {
    alignItems: 'flex-end',
    flex: 1
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#6366f1', // indigo-500 for brand
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  metaTable: {
    marginTop: 10,
    width: 200
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  metaLabel: {
    color: '#64748b',
    fontWeight: 600
  },
  metaValue: {
    fontWeight: 600,
    color: '#0f172a'
  },
  addressBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  addressCol: {
    width: '45%'
  },
  addressHeading: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  addressName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: 4
  },
  addressText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4
  },
  table: {
    width: '100%',
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  tableCell: {
    fontSize: 9,
    color: '#334155'
  },
  // Table Column Widths
  colNo: { width: '5%' },
  colItem: { width: '35%' },
  colHsn: { width: '10%' },
  colQty: { width: '10%', textAlign: 'right' },
  colRate: { width: '12%', textAlign: 'right' },
  colTax: { width: '13%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  
  summaryBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  bankDetails: {
    width: '50%'
  },
  bankHeading: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 6
  },
  bankText: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 3
  },
  totalsTable: {
    width: '40%'
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  totalsLabel: {
    fontSize: 9,
    color: '#475569'
  },
  totalsValue: {
    fontSize: 9,
    color: '#0f172a',
    fontWeight: 600
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#0f172a'
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a'
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#6366f1'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  termsSection: {
    width: '70%'
  },
  termsHeading: {
    fontSize: 8,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 4
  },
  termsText: {
    fontSize: 7,
    color: '#94a3b8',
    lineHeight: 1.3
  },
  signatureSection: {
    width: '30%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end'
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    marginTop: 40,
    paddingTop: 4,
    textAlign: 'center'
  },
  signatureText: {
    fontSize: 8,
    color: '#64748b'
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 7,
    color: '#cbd5e1'
  },
  watermark: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    opacity: 0.05,
    transform: 'rotate(-45deg)'
  },
  watermarkText: {
    fontSize: 120,
    fontWeight: 700,
    color: '#000000'
  }
});
