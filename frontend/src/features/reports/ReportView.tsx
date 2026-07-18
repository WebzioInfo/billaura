import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Download, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
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

  const renderSalesPurchaseKPIs = () => {
    if (!data || isInventory) return null;
    const isSales = title.includes('Sales');
    const totalAmount = isSales ? data.totalSales : data.totalPurchases;
    const count = isSales ? data.invoiceCount : data.purchaseCount;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-surface shadow-sm border-border">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total {isSales ? 'Revenue' : 'Spend'}</p>
            <h3 className="text-3xl font-bold text-foreground">
              ₹{Number(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-surface shadow-sm border-border">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Tax</p>
            <h3 className="text-3xl font-bold text-foreground">
              ₹{Number(data.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-surface shadow-sm border-border">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Documents Generated</p>
            <h3 className="text-3xl font-bold text-foreground">{count}</h3>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInventoryKPIs = () => {
    if (!data || !isInventory) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-surface shadow-sm border-border">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Valuation</p>
            <h3 className="text-3xl font-bold text-foreground">
              ₹{Number(data.totalValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-surface shadow-sm border-border">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Items in Stock</p>
            <h3 className="text-3xl font-bold text-foreground">{data.totalItems}</h3>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-red-600 mb-1">Low Stock Alerts</p>
            <h3 className="text-3xl font-bold text-red-600">{data.lowStockCount}</h3>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTable = () => {
    if (isInventory) {
      const items = data?.inventory || [];
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category / Brand</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Valuation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  {item.productName}
                  {item.isLowStock && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Low Stock</span>}
                </TableCell>
                <TableCell>{item.category} / {item.brand}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">₹{item.avgCost.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">₹{item.valuation.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    } else {
      const items = title.includes('Sales') ? data?.invoices || [] : data?.purchases || [];
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Document No</TableHead>
              <TableHead>Party Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{item.invoiceNo || item.billNo}</TableCell>
                <TableCell>{item.customer || item.vendor}</TableCell>
                <TableCell className="text-right font-medium">₹{item.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader 
        title={title} 
        description={`Comprehensive analytics and breakdown for ${title.toLowerCase()}`}
        primaryAction={
          <div className="flex items-center gap-4">
            {!isInventory && (
              <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5 shadow-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent border-none text-sm outline-none text-foreground"
                />
                <span className="text-muted-foreground">-</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent border-none text-sm outline-none text-foreground"
                />
              </div>
            )}
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="primary">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="mt-8 flex justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-8">
          {renderSalesPurchaseKPIs()}
          {renderInventoryKPIs()}
          
          <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden shadow-sm">
            {renderTable()}
          </div>
        </div>
      )}
    </PageContainer>
  );
};
