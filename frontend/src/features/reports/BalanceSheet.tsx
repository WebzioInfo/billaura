import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { Download } from 'lucide-react';

export const BalanceSheet = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/reports/balance-sheet');
        setData(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Balance Sheet"
        description="Comprehensive asset and liability overview"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />
      <div className="glass-panel rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={2}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={2}><div className="text-center py-8 text-muted-foreground">No data found</div></TableCell></TableRow>
            ) : data.map((item: any, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{item.accountName}</TableCell>
                <TableCell className="text-right font-bold">${item.balance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
