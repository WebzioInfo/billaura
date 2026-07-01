import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { DataTable, DataTableColumnHeader } from '../../components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

export const JournalVouchersList = () => {
  const navigate = useNavigate();

  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const res = await api.get('/journal-entries');
      return res.data;
    },
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span>{new Date(row.getValue('date')).toLocaleDateString()}</span>,
    },
    {
      accessorKey: 'reference',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue('reference') || '-'}</span>,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span>{row.getValue('description') || '-'}</span>,
    },
    {
      id: 'debit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debit" />,
      cell: ({ row }) => {
        const totalDebit = row.original.lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
        return <span className="font-medium text-right block">{totalDebit.toFixed(2)}</span>;
      },
    },
    {
      id: 'credit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" />,
      cell: ({ row }) => {
        const totalCredit = row.original.lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);
        return <span className="font-medium text-right block">{totalCredit.toFixed(2)}</span>;
      },
    },
    {
      id: 'actions',
      cell: () => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm">
            View <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal Vouchers</h1>
          <p className="text-muted-foreground">Manage your manual journal entries.</p>
        </div>
        <Button onClick={() => navigate('/journal-entries/new')}>
          <Plus className="mr-2 h-4 w-4" /> Add Journal Voucher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Journal Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <DataTable columns={columns} data={journalEntries?.data || []} searchKey="reference" exportFilename="journal_vouchers" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
