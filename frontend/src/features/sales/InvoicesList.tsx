import React, { useMemo } from 'react';
import { Plus, Receipt, Eye, Sparkles } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Card, Button, PageContainer, EmptyState, TableLoader } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const formatIndianCurrency = (amount: number) => {
  const rounded = Math.abs(amount) < 0.005 ? 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
};

export const InvoicesList = () => {
  const navigate = useNavigate();

  const { data: rawInvoices, isLoading: loading } = useQuery<any>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/invoices');
      // Support nested and flat responses
      const list = res.data?.data?.data || res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    },
    staleTime: 30 * 1000, // cache for 30s to reduce redundant API queries
  });

  const invoices = useMemo(() => {
    return Array.isArray(rawInvoices) ? rawInvoices : [];
  }, [rawInvoices]);

  const getCalculatedStatus = (item: any) => {
    if (item.status === 'CANCELLED' || item.status === 'VOID') return { label: 'Cancelled', style: 'bg-red-500/10 text-red-600 border border-red-500/20' };
    if (item.status === 'DRAFT') return { label: 'Draft', style: 'bg-slate-500/10 text-slate-600 border border-slate-500/20' };

    const grandTotal = Number(item.grandTotal || 0) - (Number(item.roundOff || 0));
    const amountPaid = Number(item.amountPaid || 0);
    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();

    if (amountPaid >= grandTotal && grandTotal > 0) {
      return { label: 'Paid', style: 'bg-green-500/10 text-green-600 border border-green-500/20' };
    }
    if (amountPaid > 0 && amountPaid < grandTotal) {
      return { label: 'Partially Paid', style: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' };
    }
    if (isOverdue) {
      return { label: 'Overdue', style: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' };
    }
    return { label: 'Issued', style: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
  };

  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-6">
        <PageHeader
          title="Invoices"
          description="Manage client billings, tax configurations, and receivables ledger tracking"
          primaryAction={
            <Button 
              onClick={() => navigate('/invoices/new')}
              className="flex items-center gap-2 font-semibold px-5 shadow-sm hover:shadow-md transition-all duration-200"
              variant="primary"
            >
              <Plus className="w-4 h-4" /> New Invoice
            </Button>
          }
        />

        {loading ? (
          <TableLoader cols={6} rows={6} className="bg-surface border border-border rounded-2xl" />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12 text-muted-foreground/60" />}
            title="No Invoices Found"
            description="Create your first client tax invoice to record sales and track ledgers."
            actionLabel="New Invoice"
            onActionClick={() => navigate('/invoices/new')}
          />
        ) : (
          <Card className="overflow-hidden border border-border/60 shadow-sm bg-surface">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b border-border">
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground">Invoice No</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground">Customer</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground text-right">Taxable</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground text-right">Tax Amount</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground text-right">Grand Total</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground text-right">Balance Due</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                    <TableHead className="font-semibold py-4 px-6 text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((item: any) => {
                    const statusConfig = getCalculatedStatus(item);
                    const outstanding = Number(item.grandTotal || 0) - Number(item.amountPaid || 0);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 border-b border-border/60 transition-colors">
                        <TableCell className="font-semibold py-4 px-6 text-foreground text-sm tracking-wide">
                          {item.invoiceNo}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                          {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm">
                          <div className="font-medium text-foreground">{item.businessPartner?.name || 'N/A'}</div>
                          {item.businessPartner?.gstNumber && (
                            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{item.businessPartner.gstNumber}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-right text-muted-foreground font-mono">
                          ₹{formatIndianCurrency(Number(item.subTotal || 0))}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-right text-muted-foreground font-mono">
                          ₹{formatIndianCurrency(Number(item.taxTotal || 0))}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-right font-bold text-foreground font-mono">
                          ₹{formatIndianCurrency(Number(item.grandTotal || 0))}
                        </TableCell>
                        <TableCell className={`py-4 px-6 text-sm text-right font-semibold font-mono ${outstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          ₹{formatIndianCurrency(outstanding)}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${statusConfig.style}`}>
                            {statusConfig.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => navigate(`/invoices/${item.id}`)}
                              variant="outline"
                              size="sm"
                              className="h-8 flex items-center gap-1 hover:bg-muted/80 text-foreground border-border/80 shadow-sm cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Table Footer with Summary Stats */}
            <div className="bg-muted/5 border-t border-border p-4 px-6 text-xs text-muted-foreground flex justify-between items-center">
              <span>Total Invoices: {invoices.length}</span>
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-accent" />
                Double Entry ledger synchronized with Company Context
              </span>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};
