import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
  logoBlock: { width: '50%' },
  metaBlock: { width: '50%', alignItems: 'flex-end' },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#4F46E5', textTransform: 'uppercase', marginBottom: 8 },
  metaText: { fontSize: 10, color: '#666', marginBottom: 3 },
  metaValue: { color: '#111', fontWeight: 'bold' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#111', backgroundColor: '#F3F4F6', padding: 6, marginBottom: 10, marginTop: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  col1: { width: '30%', color: '#666' },
  col2: { width: '70%', color: '#111', fontWeight: 'bold' },
  totalsBox: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15, width: '50%', alignSelf: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontWeight: 'bold', color: '#666' },
  totalValue: { fontWeight: 'bold', fontSize: 12 },
  grandTotalLabel: { fontWeight: 'bold', fontSize: 14, color: '#111' },
  grandTotalValue: { fontWeight: 'bold', fontSize: 14, color: '#4F46E5' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  badge: { padding: '4px 8px', borderRadius: 4, backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: 9, fontWeight: 'bold', alignSelf: 'flex-end' },
  approvedBadge: { padding: '4px 8px', borderRadius: 4, backgroundColor: '#DCFCE7', color: '#166534', fontSize: 9, fontWeight: 'bold', alignSelf: 'flex-end', marginTop: 4 },
});

export const ExpenseReceiptPdf = ({ expense, company }: { expense: any; company: any }) => {
  const formatAmount = (val: number) => `$${Number(val).toFixed(2)}`;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoBlock}>
            <Text style={styles.companyName}>{company?.name || ''}</Text>
            <Text style={{ color: '#666', marginBottom: 2 }}>{company?.address || ''}</Text>
            {company?.email && <Text style={{ color: '#666' }}>{company.email}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.title}>EXPENSE RECEIPT</Text>
            <Text style={styles.metaText}>Receipt No: <Text style={styles.metaValue}>{expense.expenseNo}</Text></Text>
            <Text style={styles.metaText}>Date: <Text style={styles.metaValue}>{new Date(expense.date).toLocaleDateString()}</Text></Text>
            <Text style={styles.metaText}>Status: </Text>
            <View style={styles.badge}><Text>{expense.status}</Text></View>
            {expense.approvalStatus === 'APPROVED' && (
              <View style={styles.approvedBadge}><Text>APPROVED</Text></View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Expense Details</Text>
        <View style={styles.row}>
          <Text style={styles.col1}>Category:</Text>
          <Text style={styles.col2}>{expense.category?.name || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col1}>Description:</Text>
          <Text style={styles.col2}>{expense.description || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col1}>Bill Number:</Text>
          <Text style={styles.col2}>{expense.billNumber || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col1}>Payment Method:</Text>
          <Text style={styles.col2}>{expense.paymentMethod || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col1}>Source Ledger:</Text>
          <Text style={styles.col2}>{expense.bankAccount?.name || expense.cashAccount?.name || 'N/A'}</Text>
        </View>

        {expense.notes && (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ color: '#444', lineHeight: 1.4 }}>{expense.notes}</Text>
          </>
        )}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Base Amount:</Text>
            <Text style={styles.totalValue}>{formatAmount(expense.amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax Amount:</Text>
            <Text style={styles.totalValue}>{formatAmount(expense.taxAmount)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' }]}>
            <Text style={styles.grandTotalLabel}>Total Amount:</Text>
            <Text style={styles.grandTotalValue}>{formatAmount(expense.totalAmount)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a system-generated expense receipt. For internal record-keeping only.
        </Text>
      </Page>
    </Document>
  );
};
