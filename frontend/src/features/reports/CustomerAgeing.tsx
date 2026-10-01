import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, CurrencyCell } from '@/shared/components/ui';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Printer, Download } from 'lucide-react';

export default function CustomerAgeing() {
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: ageingData = [], isLoading, isError } = useQuery({
    queryKey: ['customer-ageing', asOfDate],
    queryFn: async () => {
      const res = await apiClient.get('/reports/customer-ageing', {
        params: { asOfDate },
      });
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const totals = ageingData.reduce((acc: any, row: any) => ({
    current: acc.current + Number(row.current || 0),
    days30: acc.days30 + Number(row.days30 || 0),
    days60: acc.days60 + Number(row.days60 || 0),
    days90: acc.days90 + Number(row.days90 || 0),
    older: acc.older + Number(row.older || 0),
    total: acc.total + Number(row.total || 0),
  }), { current: 0, days30: 0, days60: 0, days90: 0, older: 0, total: 0 });

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

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground px-2">Outstanding Balances</h3>
        {isLoading ? (
          <TableLoader rows={6} />
        ) : isError ? (
          <div className="p-12 text-center text-red-500 bg-surface rounded-xl border border-border">Failed to load report</div>
        ) : ageingData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-surface rounded-xl border border-border text-sm">No outstanding balances found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 pr-4">Customer</TableHead>
                <TableHead align="right">Current</TableHead>
                <TableHead align="right">1-30 Days</TableHead>
                <TableHead align="right">31-60 Days</TableHead>
                <TableHead align="right">61-90 Days</TableHead>
                <TableHead align="right">&gt;90 Days</TableHead>
                <TableHead align="right" className="pr-6 pl-4">Total Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ageingData.map((row: any) => (
                <TableRow key={row.customerId}>
                  <TableCell className="pl-6 pr-4 font-semibold text-foreground">{row.customerName}</TableCell>
                  <CurrencyCell amount={row.current} />
                  <CurrencyCell amount={row.days30} />
                  <CurrencyCell amount={row.days60} />
                  <CurrencyCell amount={row.days90} className="text-amber-600 dark:text-amber-400" />
                  <CurrencyCell amount={row.older} className="text-rose-600 dark:text-rose-400 font-medium" />
                  <CurrencyCell amount={row.total} className="pr-6 pl-4 font-bold text-foreground" />
                </TableRow>
              ))}
              <TableRow isTotalRow>
                <TableCell className="pl-6 pr-4 font-bold text-foreground">Total</TableCell>
                <CurrencyCell amount={totals.current} className="font-bold text-foreground" />
                <CurrencyCell amount={totals.days30} className="font-bold text-foreground" />
                <CurrencyCell amount={totals.days60} className="font-bold text-foreground" />
                <CurrencyCell amount={totals.days90} className="font-bold text-foreground" />
                <CurrencyCell amount={totals.older} className="font-bold text-foreground" />
                <CurrencyCell amount={totals.total} className="pr-6 pl-4 font-black text-foreground" />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
