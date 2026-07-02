import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useNavigate } from 'react-router-dom';

export const InvoicesList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/sales/invoices');
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
        title="Invoices"
        description="Manage your sales invoices"
        primaryAction={
          <button 
            onClick={() => navigate('/app/invoices/new')}
            className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">Loading...</div></TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={5}><div className="text-center py-8 text-muted-foreground">No invoices found</div></TableCell></TableRow>
          ) : data.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-semibold">{item.invoiceNumber}</TableCell>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.customer?.name}</TableCell>
              <TableCell className="font-bold text-right">${item.totalAmount}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs ${item.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
