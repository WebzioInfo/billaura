import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, CurrencyCell, DateCell, SearchableSelect } from '@/shared/components/ui';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Printer, Download } from 'lucide-react';

export default function CustomerStatement() {
  const [customerId, setCustomerId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      return res.data?.data || res.data || [];
    },
  });

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ['customer-statement', customerId, startDate, endDate],
    queryFn: async () => {
      if (!customerId) return null;
      const res = await apiClient.get('/reports/customer-statement', {
        params: { customerId, startDate, endDate },
      });
      return res.data?.data || res.data;
    },
    enabled: !!customerId,
  });


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customer Statement" 
        description="View chronological transaction history and running balances"
        secondaryAction={<Button variant="outline" disabled={!statement}><Printer className="w-4 h-4 mr-2"/> Print</Button>}
        primaryAction={<Button variant="outline" disabled={!statement}><Download className="w-4 h-4 mr-2"/> Export PDF</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <SearchableSelect
                label="Customer"
                value={customerId}
                onChange={val => setCustomerId(val)}
                options={customers || []}
                mapOption={(c: any) => ({
                  value: c.id,
                  label: c.name,
                  subLabel: c.phone || c.gstin ? [c.phone, c.gstin].filter(Boolean).join(' • ') : undefined,
                  searchKeywords: [c.phone, c.gstin, c.customerCode].filter(Boolean),
                })}
                placeholder="Select a customer..."
                searchPlaceholder="Search customers by name, phone..."
                clearable
              />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {customerId && (
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between px-2">
            <div>
              <h3 className="text-lg font-bold text-foreground">Statement Details</h3>
              {statement?.customer && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  For {statement.customer.name} ({formatDate(startDate)} to {formatDate(endDate)})
                </p>
              )}
            </div>
            {statement && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p className={`text-lg font-bold ${statement.closingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(statement.closingBalance)}
                </p>
              </div>
            )}
          </div>

          {isLoading ? (
            <TableLoader rows={5} />
          ) : isError ? (
            <div className="p-12 text-center text-red-500 bg-surface rounded-xl border border-border">Failed to load statement</div>
          ) : !statement?.lines?.length ? (
            <div className="p-12 text-center text-muted-foreground bg-surface rounded-xl border border-border text-sm">No transactions found for this period.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 pr-4">Date</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead align="right">Debit</TableHead>
                  <TableHead align="right">Credit</TableHead>
                  <TableHead align="right" className="pr-6 pl-4">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.lines.map((line: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6 pr-4">
                      <DateCell date={line.date} />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{line.type}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{line.reference || '—'}</TableCell>
                    <CurrencyCell amount={line.debit} />
                    <CurrencyCell amount={line.credit} />
                    <CurrencyCell amount={line.balance} className="pr-6 pl-4 font-semibold text-foreground" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
