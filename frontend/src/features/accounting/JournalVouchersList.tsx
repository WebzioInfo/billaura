import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { IconButton } from '@/shared/components/ui/IconButton';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { EmptyState, LoadingState } from '@/shared/components/ui/LayoutComponents';
import { Plus, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/core/api/apiClient';
import { DataTable, DataTableColumnHeader, CurrencyCell, DateCell } from '@/shared/components/ui';
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
      cell: ({ row }) => <DateCell date={row.getValue('date')} />,
    },
    {
      accessorKey: 'reference',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
      cell: ({ row }) => <span className="tabular-nums font-medium text-foreground">{row.getValue('reference') || '—'}</span>,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('description') || '—'}</span>,
    },
    {
      id: 'debit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debit" className="justify-end" />,
      cell: ({ row }) => {
        const totalDebit = row.original.lines?.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0) || 0;
        return <CurrencyCell amount={totalDebit} />;
      },
    },
    {
      id: 'credit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" className="justify-end" />,
      cell: ({ row }) => {
        const totalCredit = row.original.lines?.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0) || 0;
        return <CurrencyCell amount={totalCredit} />;
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right pr-2">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end pr-2">
          <IconButton
            icon={ArrowRight}
            size="dense"
            aria-label="View Entry Details"
            tooltip="View Entry Details"
            onClick={() => navigate(`/journal-entries/${row.original.id}`)}
          />
        </div>
      ),
    },
  ];

  const entriesData = journalEntries?.data || [];

  return (
    <PageLayout>
      <PageHeader
        title="Journal Entries"
        count={entriesData.length}
        primaryAction={
          <Button 
            onClick={() => navigate('/journal-entries/new')}
            variant="primary"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Journal Entry
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
        <div className="flex-1 min-h-0 flex flex-col mt-3">
          <DataTable columns={columns} data={entriesData} searchKey="reference" exportFilename="journal_vouchers" itemLabel="journal entries" />
        </div>
      )}
    </PageLayout>
  );
};
