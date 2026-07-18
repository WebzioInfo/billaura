import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient as api } from '../../core/api/apiClient';

interface CustomerDetailModalProps {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerDetailModal({ customer, isOpen, onClose }: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'ledger' | 'ageing'>('ledger');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customer) {
      const fetchCustomerData = async () => {
        setIsLoading(true);
        try {
          // Fetch invoices and payments
          const [invRes, payRes] = await Promise.all([
            api.get('/sales/invoices'),
            api.get('/sales/payments')
          ]);
          
          // Filter for this customer
          const customerInvoices = (invRes.data?.data?.items || invRes.data?.items || []).filter((i: any) => i.businessPartnerId === customer.id);
          const customerPayments = (payRes.data?.data?.items || payRes.data?.items || []).filter((p: any) => p.businessPartnerId === customer.id || p.customerId === customer.id); // depending on what field is used
          
          setInvoices(customerInvoices);
          setPayments(customerPayments);
        } catch (error) {
          console.error("Failed to fetch customer ledger", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCustomerData();
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Compile Ledger (chronological combination of invoices + payments)
  const ledgerEntries = [
    ...invoices.map(i => ({
      id: i.id,
      date: i.date,
      type: 'INVOICE',
      ref: i.invoiceNo,
      debit: Number(i.grandTotal), // Customer owes us (Debit AR)
      credit: 0
    })),
    ...payments.map(p => ({
      id: p.id,
      date: p.date,
      type: 'PAYMENT',
      ref: p.paymentNo || p.receiptNo,
      debit: 0,
      credit: Number(p.amount) // Customer paid us (Credit AR)
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const ledgerWithBalance = ledgerEntries.reduce((acc, entry) => {
    const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    const balance = prevBalance + (entry.debit - entry.credit);
    acc.push({ ...entry, balance });
    return acc;
  }, [] as (typeof ledgerEntries[0] & { balance: number })[]);

  // Calculate Ageing (0-30, 31-60, 61-90, >90)
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID');
  const now = new Date().getTime();
  
  const ageing = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    older: 0
  };

  unpaidInvoices.forEach(inv => {
    const balance = Number(inv.grandTotal) - Number(inv.amountPaid || 0);
    const dueDate = new Date(inv.dueDate || inv.date).getTime();
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue <= 0) ageing.current += balance;
    else if (daysOverdue <= 30) ageing.days30 += balance;
    else if (daysOverdue <= 60) ageing.days60 += balance;
    else if (daysOverdue <= 90) ageing.days90 += balance;
    else ageing.older += balance;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-4xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35 shrink-0">
          <div>
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
              {customer.name}
              <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {customer.customerType || 'UNREGISTERED'}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{customer.customerCode} | GSTIN: {customer.gstin || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Header */}
        <div className="grid grid-cols-3 gap-4 p-6 shrink-0 border-b border-border bg-background/20">
           <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Outstanding Balance</span>
              <h3 className="text-2xl font-black text-red-500 mt-1">{formatCurrency(Number(customer.outstandingAmount || 0))}</h3>
           </div>
           <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Credit Limit</span>
              <h3 className="text-2xl font-black text-foreground mt-1">{formatCurrency(Number(customer.creditLimit || 0))}</h3>
           </div>
           <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Available Credit</span>
              <h3 className="text-2xl font-black text-green-500 mt-1">
                {formatCurrency(Math.max(0, Number(customer.creditLimit || 0) - Number(customer.outstandingAmount || 0)))}
              </h3>
           </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 shrink-0">
          <button
            onClick={() => setActiveTab('ledger')}
            className={cn("px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer", activeTab === 'ledger' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            Ledger View
          </button>
          <button
            onClick={() => setActiveTab('ageing')}
            className={cn("px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer", activeTab === 'ageing' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            Ageing Report
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">Loading customer data...</div>
          ) : activeTab === 'ledger' ? (
            <div className="border border-border rounded-xl overflow-hidden bg-surface">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-background/40 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Ref</th>
                    <th className="py-3 px-4 text-right">Debit (₹)</th>
                    <th className="py-3 px-4 text-right">Credit (₹)</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerWithBalance.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No ledger entries found.</td></tr>
                  ) : (
                    ledgerWithBalance.map((entry, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-background/20">
                        <td className="py-3 px-4">{entry.date.split('T')[0]}</td>
                        <td className="py-3 px-4">
                           <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", entry.type === 'INVOICE' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500')}>
                             {entry.type}
                           </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{entry.ref}</td>
                        <td className="py-3 px-4 text-right text-red-400">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                        <td className="py-3 px-4 text-right text-green-400">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                        <td className="py-3 px-4 text-right font-bold">{formatCurrency(entry.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-5 gap-4">
                <div className="p-4 rounded-xl border border-border bg-surface text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Current</span>
                  <h3 className="text-lg font-bold text-foreground mt-1">{formatCurrency(ageing.current)}</h3>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">1-30 Days</span>
                  <h3 className="text-lg font-bold text-amber-500 mt-1">{formatCurrency(ageing.days30)}</h3>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">31-60 Days</span>
                  <h3 className="text-lg font-bold text-orange-500 mt-1">{formatCurrency(ageing.days60)}</h3>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">61-90 Days</span>
                  <h3 className="text-lg font-bold text-red-500 mt-1">{formatCurrency(ageing.days90)}</h3>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface text-center bg-red-500/5">
                  <span className="text-xs font-semibold text-red-500 uppercase">{'>'} 90 Days</span>
                  <h3 className="text-lg font-bold text-red-600 mt-1">{formatCurrency(ageing.older)}</h3>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-surface">
                <div className="px-4 py-3 border-b border-border bg-background/30 text-sm font-semibold">Overdue Invoices Details</div>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-background/40 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Invoice No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Invoice Total</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidInvoices.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No overdue invoices found.</td></tr>
                    ) : (
                      unpaidInvoices.map((inv, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-background/20">
                          <td className="py-3 px-4 font-mono">{inv.invoiceNo}</td>
                          <td className="py-3 px-4">{inv.date.split('T')[0]}</td>
                          <td className="py-3 px-4 text-red-400 font-semibold">{(inv.dueDate || inv.date).split('T')[0]}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(Number(inv.grandTotal))}</td>
                          <td className="py-3 px-4 text-right font-bold text-red-500">
                            {formatCurrency(Number(inv.grandTotal) - Number(inv.amountPaid || 0))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
