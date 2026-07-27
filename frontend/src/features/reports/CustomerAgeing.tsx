import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { formatCurrency } from '@/shared/utils/formatters';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Printer, Download } from 'lucide-react';

export default function CustomerAgeing() {
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: ageingData, isLoading, isError } = useQuery({
    queryKey: ['customer-ageing', asOfDate],
    queryFn: async () => {
      const res = await apiClient.get('/reports/customer-ageing', {
        params: { asOfDate },
      });
      return res.data?.data || res.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customer Ageing Summary" 
        description="Analyze outstanding customer balances grouped by overdue days"
        secondaryAction={<Button variant="outline"><Printer className="w-4 h-4 mr-2"/> Print</Button>}
        primaryAction={<Button variant="outline"><Download className="w-4 h-4 mr-2"/> Export CSV</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="max-w-xs">
            <label className="text-sm font-medium">As of Date</label>
            <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg">Outstanding Balances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading ageing report...</div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500">Failed to load report</div>
          ) : !ageingData?.length ? (
            <div className="p-8 text-center text-gray-500">No outstanding balances found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">1-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">&gt;90 Days</TableHead>
                  <TableHead className="text-right font-bold text-gray-900">Total Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageingData.map((row: any) => (
                  <TableRow key={row.customerId}>
                    <TableCell className="font-medium text-blue-600">{row.customerName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.current)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.days30)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.days60)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(row.days90)}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{formatCurrency(row.older)}</TableCell>
                    <TableCell className="text-right font-bold text-gray-900">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
