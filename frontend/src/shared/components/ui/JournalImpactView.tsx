import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { FileText, ArrowRight } from 'lucide-react';

interface JournalImpactViewProps {
  reference: string;
}

export const JournalImpactView: React.FC<JournalImpactViewProps> = ({ reference }) => {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal-entries-reference', reference],
    queryFn: async () => {
      const res = await apiClient.get(`/journal-entries?search=${reference}`);
      return res.data?.data || res.data || [];
    },
    enabled: !!reference,
  });

  if (isLoading) {
    return <div className="p-4 text-xs text-muted-foreground animate-pulse">Loading accounting impact...</div>;
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="p-6 border border-dashed rounded-lg bg-muted/20 text-center">
        <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No Accounting Entries</p>
        <p className="text-xs text-muted-foreground mt-1">This transaction has not posted any journal entries to the general ledger yet.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div className="space-y-4">
      {entries.map((entry: any) => (
        <div key={entry.id} className="border border-border/80 rounded-xl overflow-hidden bg-surface shadow-xs">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/80 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-foreground">Journal Voucher: <span className="text-accent">{entry.voucherNo || entry.reference}</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{entry.description}</p>
            </div>
            <p className="text-[10px] font-mono font-medium bg-background px-2 py-1 rounded border border-border shadow-xs">
              {new Date(entry.date).toLocaleDateString()}
            </p>
          </div>
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow>
                <TableHead className="w-[10px]"></TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Ledger Account</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Debit</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines?.map((line: any) => (
                <TableRow key={line.id} className="hover:bg-muted/30 border-b-0 border-border/40">
                  <TableCell>
                    {Number(line.credit) > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground inline ml-4" />}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground font-medium py-2">
                    {line.account?.name || 'Unknown Ledger'}
                    {line.description && <span className="block text-[9px] font-sans text-muted-foreground/70 font-normal">{line.description}</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs py-2">
                    {Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs py-2">
                    {Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/10 border-t border-border/80">
                <TableCell colSpan={2} className="text-right text-xs font-bold text-foreground py-2">Total</TableCell>
                <TableCell className="text-right font-mono text-xs font-black py-2">
                  {formatCurrency(entry.lines?.reduce((sum: number, l: any) => sum + Number(l.debit), 0) || 0)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-black py-2">
                  {formatCurrency(entry.lines?.reduce((sum: number, l: any) => sum + Number(l.credit), 0) || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};
