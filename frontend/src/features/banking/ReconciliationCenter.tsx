import React, { useState } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge, DateCell, CurrencyCell, Button } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUp, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ReconciliationCenter = () => {
  const queryClient = useQueryClient();
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  const { data: statements = [], isLoading: loadingStatements } = useQuery({
    queryKey: ['bank-statements'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/reconciliation/statements');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const { data: lines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['bank-statement-lines', selectedStatementId],
    queryFn: async () => {
      if (!selectedStatementId) return [];
      const res = await apiClient.get(`/finance/reconciliation/statements/${selectedStatementId}/lines`);
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: !!selectedStatementId
  });

  const autoMatch = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/finance/reconciliation/statements/${id}/auto-match`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
    }
  });

  return (
    <PageLayout
      isLoading={loadingStatements && statements.length === 0}
      loadingTitle="Loading Bank Reconciliation..."
      loadingDescription="Fetching bank statements and ledger match rules..."
    >
      <PageHeader
        title="Bank Reconciliation"
        description="Match bank statements with your ledger automatically"
        primaryAction={
          <Button variant="primary">
            <FileUp className="w-4 h-4 mr-1.5" /> Upload Statement
          </Button>
        }
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Statements List */}
        <div className="lg:col-span-1 bg-surface dark:bg-[#17161C] border border-border rounded-xl shadow-xs flex flex-col min-h-0 overflow-hidden">
          <div className="p-3.5 border-b border-border font-semibold text-foreground text-sm">Statements</div>
          <div className="flex-1 overflow-y-auto scrollbar-overlay">
            {loadingStatements ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading statements...</div>
            ) : statements.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">No statements available.</div>
            ) : (
              <ul className="divide-y divide-border/40">
                {statements.map((stmt: any) => (
                  <li 
                    key={stmt.id} 
                    className={cn(
                      'p-3.5 cursor-pointer hover:bg-muted/40 transition-colors',
                      selectedStatementId === stmt.id && 'bg-primary/10 border-l-3 border-primary dark:bg-primary/20'
                    )}
                    onClick={() => setSelectedStatementId(stmt.id)}
                  >
                    <p className="font-medium text-sm text-foreground">
                      Statement {new Date(stmt.statementDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stmt.bankAccount?.name}</p>
                    <p className="text-xs font-medium text-foreground mt-1">Status: {stmt.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Statement Lines */}
        <div className="lg:col-span-2 bg-surface dark:bg-[#17161C] border border-border rounded-xl shadow-xs flex flex-col min-h-0 overflow-hidden">
          <div className="p-3.5 border-b border-border flex justify-between items-center shrink-0">
            <span className="font-semibold text-foreground text-sm">Statement Lines</span>
            {selectedStatementId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => autoMatch.mutate(selectedStatementId)}
                disabled={autoMatch.isPending}
                className="gap-1.5"
              >
                {autoMatch.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Auto-Match
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-overlay">
            {!selectedStatementId ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-8">
                Select a statement to view its lines.
              </div>
            ) : loadingLines ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading lines...</div>
            ) : lines.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No lines found.</div>
            ) : (
              <table className="w-full text-left border-collapse text-[14px]">
                <thead className="sticky top-0 z-20 bg-[#34303F] dark:bg-[#1E1C26] text-white font-medium select-none shadow-xs h-11 text-[13px]">
                  <tr>
                    <th className="pl-6 pr-4 py-2 text-white font-medium">Date</th>
                    <th className="px-4 py-2 text-white font-medium">Description</th>
                    <th className="px-4 py-2 text-white font-medium text-right">Amount</th>
                    <th className="pr-6 pl-4 py-2 text-white font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-none text-[14px]">
                  {lines.map((line: any, idx: number) => {
                    const isEven = idx % 2 === 1;
                    return (
                      <tr
                        key={line.id}
                        className={cn(
                          'h-[48px] border-b border-border/30 transition-colors',
                          isEven
                            ? 'bg-[#F9FAFB] dark:bg-[#1C1B22] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                            : 'bg-white dark:bg-[#17161C] hover:bg-[#F3F4F6] dark:hover:bg-[#24232C]'
                        )}
                      >
                        <td className="pl-6 pr-4 py-2 text-sm">
                          <DateCell date={line.date} />
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-sm font-medium">{line.description}</td>
                        <td className="px-4 py-2 text-right text-sm">
                          <CurrencyCell amount={Number(line.amount || 0)} className="font-semibold text-foreground tabular-nums" />
                        </td>
                        <td className="pr-6 pl-4 py-2 text-center text-sm">
                          <StatusBadge status={line.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};


