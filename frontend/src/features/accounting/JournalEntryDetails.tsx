import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Printer, AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/ui/LayoutComponents';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const JournalEntryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: resData, isLoading, error } = useQuery<any>({
    queryKey: ['journal-entries', id],
    queryFn: async () => {
      const res = await apiClient.get(`/journal-entries/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const entry = useMemo(() => resData || null, [resData]);

  useDynamicTitle(entry ? (entry.reference ? `Journal: ${entry.reference}` : 'Journal Entry') : null);

  if (isLoading) {
    return (
      <PageContainer maxWidth="5xl">
        <div className="space-y-6 animate-pulse">
          <div className="h-10 bg-muted/60 rounded w-1/3"></div>
          <div className="h-[400px] bg-muted/40 rounded-xl"></div>
        </div>
      </PageContainer>
    );
  }

  if (error || !entry) {
    return (
      <PageContainer maxWidth="5xl">
        <Card className="p-8 text-center bg-surface border border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Journal Entry Not Found</h3>
          <p className="text-muted-foreground mb-4">The entry you are trying to view does not exist.</p>
          <Button onClick={() => navigate('/journal-entries')} variant="outline">Back to Journal Vouchers</Button>
        </Card>
      </PageContainer>
    );
  }

  const totalDebit = entry.lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
  const totalCredit = entry.lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);

  return (
    <PageContainer maxWidth="5xl">
      <div className="space-y-6">
        <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/journal-entries')}
              className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground border border-border/40 bg-surface"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {entry.reference || 'Journal Voucher'}
                </h1>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  Posted
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Date: {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => window.print()}
              variant="outline" 
              size="sm"
              className="flex items-center gap-1.5 h-9 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          </div>
        </div>

        <Card className="border border-border/80 shadow-md bg-white p-8 mx-auto text-slate-800 rounded-2xl print:shadow-none print:border-none">
          <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Journal Voucher</h2>
              </div>
            </div>
            <div className="text-right text-sm text-slate-500 space-y-1">
              <div><span className="font-semibold text-slate-700">Date:</span> {new Date(entry.date).toLocaleDateString('en-IN')}</div>
              {entry.reference && <div><span className="font-semibold text-slate-700">Reference:</span> {entry.reference}</div>}
            </div>
          </div>

          {entry.description && (
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Narration / Description</span>
              <p className="text-sm text-slate-700 leading-relaxed">{entry.description}</p>
            </div>
          )}

          <div className="overflow-hidden border rounded-lg border-slate-200">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-1/2">Account</th>
                  <th className="py-3 px-4 text-right">Debit</th>
                  <th className="py-3 px-4 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line: any, idx: number) => {
                  const debit = Number(line.debit || 0);
                  const credit = Number(line.credit || 0);
                  return (
                    <tr key={line.id || idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{line.account?.name || 'Unknown Account'}</div>
                        {line.account?.code && <div className="text-xs text-slate-500 mt-0.5 font-mono">{line.account.code}</div>}
                      </td>
                      <td className="py-3 px-4 text-right font-sans tabular-nums tracking-tight">
                        {debit > 0 ? formatCurrency(debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-sans tabular-nums tracking-tight">
                        {credit > 0 ? formatCurrency(credit) : '-'}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-4 text-right uppercase tracking-wider text-xs">Total</td>
                  <td className="py-3 px-4 text-right font-sans tabular-nums tracking-tight text-blue-600">
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className="py-3 px-4 text-right font-sans tabular-nums tracking-tight text-blue-600">
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
