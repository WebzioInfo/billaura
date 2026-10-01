import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Button } from '@/shared/components/ui/Button';
import { AmountText } from '@/shared/components/ui';
import { DateCell } from '@/shared/components/ui/data-table/cells';
import { Pagination } from '@/shared/components/ui/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const DayBook = () => {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['reports', 'day-book'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/day-book');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  // TODO: Endpoint /reports/day-book should support server-side pagination (?page=&limit=)
  const {
    page,
    limit,
    paginatedData,
    totalPages,
    totalItems,
    setPage,
    setLimit,
  } = usePagination({
    data,
    tableKey: 'day_book',
    defaultLimit: 25,
  });

  return (
    <PageLayout>
      <PageHeader
        title="Day Book"
        count={data.length}
        primaryAction={
          <Button variant="secondary" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-card border border-border rounded-xl shadow-xs overflow-hidden mt-3">
        <div className="flex-1 min-h-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#34303F] hover:bg-[#34303F] text-white border-none">
                <TableHead className="pl-6 pr-4 text-white font-medium">Date</TableHead>
                <TableHead className="text-white font-medium">Voucher No</TableHead>
                <TableHead className="text-white font-medium">Voucher Type</TableHead>
                <TableHead className="text-white font-medium">Account</TableHead>
                <TableHead align="right" className="text-white font-medium">Debit</TableHead>
                <TableHead align="right" className="pr-6 pl-4 text-white font-medium">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No entries for today</TableCell></TableRow>
              ) : paginatedData.map((item: any, i: number) => (
                <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 pr-4"><DateCell value={item.date} /></TableCell>
                  <TableCell className="tabular-nums font-medium text-foreground">{item.voucherNo}</TableCell>
                  <TableCell className="text-muted-foreground">{item.voucherType}</TableCell>
                  <TableCell className="text-foreground">{item.accountName}</TableCell>
                  <TableCell align="right" className="tabular-nums">
                    <AmountText value={item.debit} className={Number(item.debit) > 0 ? "text-foreground font-semibold" : "text-muted-foreground opacity-30 font-normal"} />
                  </TableCell>
                  <TableCell align="right" className="pr-6 pl-4 tabular-nums">
                    <AmountText value={item.credit} className={Number(item.credit) > 0 ? "text-foreground font-semibold" : "text-muted-foreground opacity-30 font-normal"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          itemLabel="transactions"
        />
      </div>
    </PageLayout>
  );
};
