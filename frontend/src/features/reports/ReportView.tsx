import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { Button } from '@/shared/components/ui/Button';
import { Download, RefreshCw, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, CurrencyCell, DateCell } from '@/shared/components/ui';
import { Pagination } from '@/shared/components/ui/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import apiClient from '@/core/api';

export const ReportView = ({ title }: { title: string }) => {
  const isInventory = title.includes('Inventory');
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const getEndpoint = () => {
    if (title.includes('Sales')) return '/reports/sales';
    if (title.includes('Purchase')) return '/reports/purchases';
    return '/reports/inventory';
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report', title, dateRange],
    queryFn: async () => {
      const params = isInventory ? {} : { startDate: dateRange.start, endDate: dateRange.end };
      const res = await apiClient.get(getEndpoint(), { params });
      return res.data;
    }
  });

  const rawItems = isInventory 
    ? (data?.inventory || [])
    : (title.includes('Sales') ? data?.invoices || [] : data?.purchases || []);

  // TODO: Endpoint report endpoints should support server-side pagination (?page=&limit=)
  const {
    page,
    limit,
    paginatedData,
    totalPages,
    totalItems,
    setPage,
    setLimit,
  } = usePagination({
    data: rawItems,
    tableKey: `report_${title.toLowerCase().replace(/\s+/g, '_')}`,
    defaultLimit: 25,
  });

  const renderSalesPurchaseKPIs = () => {
    if (!data || isInventory) return null;
    const isSales = title.includes('Sales');
    const totalAmount = isSales ? data.totalSales : data.totalPurchases;
    const count = isSales ? data.invoiceCount : data.purchaseCount;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        <div className="p-3.5 bg-white dark:bg-card border border-border rounded-xl shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total {isSales ? 'Revenue' : 'Spend'}</p>
          <p className="text-xl font-semibold tabular-nums text-foreground mt-1">
            ₹{Number(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3.5 bg-white dark:bg-card border border-border rounded-xl shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Tax</p>
          <p className="text-xl font-semibold tabular-nums text-foreground mt-1">
            ₹{Number(data.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3.5 bg-white dark:bg-card border border-border rounded-xl shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Documents Generated</p>
          <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{count || 0}</p>
        </div>
      </div>
    );
  };

  const renderInventoryKPIs = () => {
    if (!data || !isInventory) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        <div className="p-3.5 bg-white dark:bg-card border border-border rounded-xl shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Valuation</p>
          <p className="text-xl font-semibold tabular-nums text-foreground mt-1">
            ₹{Number(data.totalValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3.5 bg-white dark:bg-card border border-border rounded-xl shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Items in Stock</p>
          <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{data.totalItems || 0}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-card border border-border rounded-xl shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Low Stock Alerts</p>
          <p className="text-xl font-semibold tabular-nums text-red-600 mt-1">{data.lowStockCount || 0}</p>
        </div>
      </div>
    );
  };

  return (
    <PageLayout>
      <PageHeader 
        title={title} 
        count={rawItems.length}
        primaryAction={
          <div className="flex items-center gap-2">
            {!isInventory && (
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent border-none text-xs outline-none text-foreground"
                />
                <span className="text-muted-foreground">-</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent border-none text-xs outline-none text-foreground"
                />
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button variant="primary" size="sm" className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
        }
      />

      {renderSalesPurchaseKPIs()}
      {renderInventoryKPIs()}

      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-card border border-border rounded-xl shadow-xs overflow-hidden mt-3">
        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading ? (
            <TableLoader cols={5} rows={limit} />
          ) : isInventory ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#34303F] hover:bg-[#34303F] text-white border-none">
                  <TableHead className="pl-6 pr-4 text-white font-medium">Product</TableHead>
                  <TableHead className="text-white font-medium">Category / Brand</TableHead>
                  <TableHead align="right" className="text-white font-medium">Qty</TableHead>
                  <TableHead align="right" className="text-white font-medium">Avg Cost</TableHead>
                  <TableHead align="right" className="pr-6 pl-4 text-white font-medium">Valuation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No inventory records found.</TableCell></TableRow>
                ) : (
                  paginatedData.map((item: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6 pr-4 font-semibold text-foreground">
                        {item.productName}
                        {item.isLowStock && <span className="ml-2 text-xs bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Low Stock</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.category} / {item.brand}</TableCell>
                      <TableCell align="right" className="tabular-nums font-medium text-foreground">{item.quantity}</TableCell>
                      <CurrencyCell amount={item.avgCost} />
                      <CurrencyCell amount={item.valuation} className="pr-6 pl-4 font-semibold text-foreground" />
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#34303F] hover:bg-[#34303F] text-white border-none">
                  <TableHead className="pl-6 pr-4 text-white font-medium">Date</TableHead>
                  <TableHead className="text-white font-medium">Document No</TableHead>
                  <TableHead className="text-white font-medium">Party Name</TableHead>
                  <TableHead align="right" className="pr-6 pl-4 text-white font-medium">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No records found for selected period.</TableCell></TableRow>
                ) : (
                  paginatedData.map((item: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6 pr-4">
                        <DateCell date={item.date} />
                      </TableCell>
                      <TableCell className="tabular-nums font-medium text-foreground">{item.invoiceNo || item.billNo}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.customer || item.vendor}</TableCell>
                      <CurrencyCell amount={item.amount} className="pr-6 pl-4 font-semibold text-foreground" />
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          itemLabel="records"
        />
      </div>
    </PageLayout>
  );
};
