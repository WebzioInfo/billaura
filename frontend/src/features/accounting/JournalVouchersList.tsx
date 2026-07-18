import React from 'react';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { PageContainer, EmptyState, LoadingState } from '../../shared/components/ui/LayoutComponents';
import { Plus, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '../../core/api/apiClient';
import { DataTable, DataTableColumnHeader } from '../../shared/components/ui/data-table';
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
        return <span className="font-medium text-right block">₹{totalDebit.toFixed(2)}</span>;
      },
    },
    {
      id: 'credit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" />,
      cell: ({ row }) => {
        const totalCredit = row.original.lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);
        return <span className="font-medium text-right block">₹{totalCredit.toFixed(2)}</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/journal-entries/${row.original.id}`)}>
            View <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const entriesData = journalEntries?.data || [];

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Journal Vouchers"
        description="Manage your manual journal entries."
        primaryAction={
          <Button 
            onClick={() => navigate('/journal-entries/new')}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> Add Journal Voucher
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState variant="table" />
      ) : entriesData.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-muted-foreground" />}
          title="No journal vouchers found"
          description="Post manual double-entry vouchers to record direct adjustments."
          actionLabel="Add Journal Voucher"
          onActionClick={() => navigate('/journal-entries/new')}
        />
      ) : (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4">
            Recent Journal Vouchers
          </h3>
          <DataTable columns={columns} data={entriesData} searchKey="reference" exportFilename="journal_vouchers" />
        </Card>
      )}
    </PageContainer>
  );
};
