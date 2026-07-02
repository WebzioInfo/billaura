import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { Download } from 'lucide-react';

export const GeneralLedger = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/reports/general-ledger');
        const items = res.data?.data || res.data || [];
        setData(Array.isArray(items) ? items : []);
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
        title="General Ledger"
        description="Detailed transaction history across all accounts"
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
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">No data found</div></TableCell></TableRow>
            ) : data.map((item: any, i) => (
              <TableRow key={i}>
                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{item.accountName}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right text-green-600">${item.debit}</TableCell>
                <TableCell className="text-right text-red-600">${item.credit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
