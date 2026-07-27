import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
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

  const customerOptions = [
    { label: 'Select a customer', value: '' },
    ...(customers || []).map((c: any) => ({ label: c.name, value: c.id }))
  ];

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
              <Select
                label="Customer"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                options={customerOptions}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-lg">Statement Details</CardTitle>
              {statement?.customer && (
                <p className="text-sm text-gray-500 mt-1">
                  For {statement.customer.name} ({formatDate(startDate)} to {formatDate(endDate)})
                </p>
              )}
            </div>
            {statement && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Closing Balance</p>
                <p className={`text-xl font-bold ${statement.closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(statement.closingBalance)}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading statement...</div>
            ) : isError ? (
              <div className="p-8 text-center text-red-500">Failed to load statement</div>
            ) : !statement?.lines?.length ? (
              <div className="p-8 text-center text-gray-500">No transactions found for this period.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.lines.map((line: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(line.date)}</TableCell>
                      <TableCell>{line.type}</TableCell>
                      <TableCell>{line.reference || '-'}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
