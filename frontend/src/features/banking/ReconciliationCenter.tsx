import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUp, CheckCircle, Loader2 } from 'lucide-react';

export const ReconciliationCenter = () => {
  const queryClient = useQueryClient();
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  const { data: statements = [], isLoading: loadingStatements } = useQuery({
    queryKey: ['bank-statements'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/reconciliation/statements');
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const { data: lines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['bank-statement-lines', selectedStatementId],
    queryFn: async () => {
      if (!selectedStatementId) return [];
      const res = await apiClient.get(`/finance/reconciliation/statements/${selectedStatementId}/lines`);
      const items = res.data?.data || res.data || [];
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
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Bank Reconciliation"
        description="Match bank statements with your ledger automatically"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <FileUp className="w-4 h-4" /> Upload Statement
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border rounded-lg shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b font-semibold">Statements</div>
          <div className="flex-1 overflow-y-auto">
            {loadingStatements ? (
              <div className="p-4 text-center text-gray-500">Loading statements...</div>
            ) : statements.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No statements available.</div>
            ) : (
              <ul className="divide-y">
                {statements.map((stmt: any) => (
                  <li 
                    key={stmt.id} 
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedStatementId === stmt.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                    onClick={() => setSelectedStatementId(stmt.id)}
                  >
                    <p className="font-medium text-sm">Statement {new Date(stmt.statementDate).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">{stmt.bankAccount?.name}</p>
                    <p className="text-sm font-semibold mt-1">Status: {stmt.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border rounded-lg shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b flex justify-between items-center">
            <span className="font-semibold">Statement Lines</span>
            {selectedStatementId && (
              <button 
                onClick={() => autoMatch.mutate(selectedStatementId)}
                disabled={autoMatch.isPending}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded flex items-center gap-2 hover:bg-blue-200"
              >
                {autoMatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Auto-Match
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedStatementId ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a statement to view its lines.
              </div>
            ) : loadingLines ? (
              <div className="p-4 text-center text-gray-500">Loading lines...</div>
            ) : lines.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No lines found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell>{new Date(line.date).toLocaleDateString()}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="font-semibold">${Number(line.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          line.status === 'MATCHED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {line.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
