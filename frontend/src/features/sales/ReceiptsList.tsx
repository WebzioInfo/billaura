import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Printer, Mail, Trash2, Edit3, 
  DollarSign, CheckCircle, RefreshCw, FileSpreadsheet, Eye, ChevronLeft, ChevronRight, Receipt 
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export const ReceiptsList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const { data, isLoading: loading, refetch: fetchReceipts } = useQuery({
    queryKey: ['receipts', search, statusFilter, methodFilter, page],
    queryFn: async () => {
      const res = await apiClient.get('/receipts', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          paymentMethod: methodFilter || undefined,
          page,
          limit: 10
        }
      });
      return res.data || {};
    }
  });

  const receipts = data?.data || data || [];
  const totalPagesValue = data?.meta?.totalPages || 1;
  const totalItemsValue = data?.meta?.totalItems || receipts.length || 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotalPages(totalPagesValue);
    setTotalItems(totalItemsValue);
  }, [totalPagesValue, totalItemsValue]);

  const handlePrint = async (id: string) => {
    try {
      const res = await apiClient.post(`/receipts/${id}/print`);
      toast.success(res.data?.message || 'Receipt sent to printer spool');
    } catch {
      toast.error('Failed to trigger receipt print');
    }
  };

  const handleEmail = async (id: string) => {
    try {
      const res = await apiClient.post(`/receipts/${id}/email`);
      toast.success(res.data?.message || 'Receipt emailed to customer');
    } catch {
      toast.error('Failed to send receipt email');
    }
  };

  const handleVoid = async (id: string) => {
    if (!window.confirm('Are you sure you want to VOID this receipt? This action reverses all ledger and customer balance changes.')) {
      return;
    }
    try {
      await apiClient.delete(`/receipts/${id}`);
      toast.success('Receipt voided and reversed successfully');
      fetchReceipts();
    } catch {
      toast.error('Failed to void receipt');
    }
  };

  const handleExportCSV = () => {
    if (receipts.length === 0) {
      toast.error('No receipt records to export');
      return;
    }
    const headers = ['Receipt No', 'Date', 'Customer', 'Payment Method', 'Account', 'Amount', 'Status'];
    const rows = receipts.map((r: any) => [
      r.receiptNo,
      new Date(r.date).toLocaleDateString(),
      r.businessPartner?.name || 'N/A',
      r.paymentMethod,
      r.account?.name || 'N/A',
      r.amount,
      r.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `receipts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Receipts exported to CSV successfully');
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Payment Receipts"
        description="View and manage money collections and invoice allocation audits."
        primaryAction={
          <Button 
            onClick={() => navigate('/receipts/new')}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> New Receipt
          </Button>
        }
      />

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-500"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Received</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              ₹{receipts.reduce((acc: number, curr: any) => acc + (curr.status === 'COMPLETED' ? Number(curr.amount) : 0), 0).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>
        <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 bg-accent/10 rounded-xl text-accent"><CheckCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Receipts</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {receipts.filter((r: any) => r.status === 'COMPLETED').length} / {totalItems}
            </h3>
          </div>
        </div>
      </div>

      {/* Control Actions Row */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex flex-1 w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by receipt no, customer, or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <Button onClick={() => fetchReceipts()} variant="outline" size="sm" className="h-9 w-9 p-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3 justify-end">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="VOID">Voided</option>
          </select>

          <select 
            value={methodFilter} 
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CREDIT_CARD">Credit Card</option>
          </select>

          <Button 
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="h-9 font-semibold flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <LoadingState variant="table" />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-muted-foreground" />}
          title="No receipts found"
          description="Record a customer payment receipt to allocate invoice balances."
          actionLabel="Record First Receipt"
          onActionClick={() => navigate('/receipts/new')}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Receipt No</TableHead>
                <TableHead className="font-semibold py-4 px-6">Date</TableHead>
                <TableHead className="font-semibold py-4 px-6">Customer</TableHead>
                <TableHead className="font-semibold py-4 px-6">Method</TableHead>
                <TableHead className="font-semibold py-4 px-6">Account Ledger</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Amount</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-center">Status</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r: any) => (
                <TableRow key={r.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <TableCell className="py-4 px-6 font-mono font-bold text-foreground">{r.receiptNo}</TableCell>
                  <TableCell className="py-4 px-6">{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell className="py-4 px-6 font-semibold text-foreground">{r.businessPartner?.name || 'N/A'}</TableCell>
                  <TableCell className="py-4 px-6 text-xs font-semibold">{r.paymentMethod}</TableCell>
                  <TableCell className="py-4 px-6 text-xs font-mono">{r.account?.name || 'N/A'}</TableCell>
                  <TableCell className="py-4 px-6 text-right font-bold text-foreground">₹{Number(r.amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="py-4 px-6 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right space-x-1.5">
                    <Button onClick={() => navigate(`/receipts/${r.id}`)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button onClick={() => navigate(`/receipts/${r.id}/edit`)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button onClick={() => handlePrint(r.id)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    <Button onClick={() => handleEmail(r.id)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Mail className="w-3.5 h-3.5" />
                    </Button>
                    {r.status === 'COMPLETED' && (
                      <Button onClick={() => handleVoid(r.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-500 hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination Row */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs text-muted-foreground">Showing page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
