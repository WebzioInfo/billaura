import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  CreditCard,
  Printer,
  Trash2,
  DollarSign,
  Plus,
  ArrowRight,
  Upload,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoStatusText,
  ZohoViewOption,
} from '@/shared/components/zoho';
import { DeleteDialog } from '@/shared/components/ui';

interface VendorCredit {
  id: string;
  creditNoteNo?: string;
  purchaseNo?: string;
  invoiceNo?: string;
  date: string;
  vendorId: string;
  vendor?: {
    name: string;
  };
  reference?: string;
  status: string;
  amount: number;
  grandTotal?: number;
  balance?: number;
  items?: Array<{
    description?: string;
    qty: number;
    rate: number;
    total?: number;
  }>;
}

export const VendorCreditsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState('ALL');
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [creditToDelete, setCreditToDelete] = useState<VendorCredit | null>(null);

  // Queries
  const { data: creditsData, isLoading } = useQuery<any>({
    queryKey: ['vendor-credits'],
    queryFn: async () => {
      // Fetch debit notes / vendor credits
      const res = await apiClient.get('/purchases', { params: { invoiceType: 'DEBIT_NOTE' } }).catch(async () => {
        return apiClient.get('/purchases');
      });
      const list = res.data?.data || res.data || [];
      const arrayList = Array.isArray(list) ? list : [];
      return arrayList.filter((item: any) => item.invoiceType === 'DEBIT_NOTE' || item.purchaseNo?.startsWith('DN') || item.purchaseNo?.startsWith('VC'));
    },
  });

  const credits: VendorCredit[] = Array.isArray(creditsData) ? creditsData : [];

  const selectedCredit = useMemo(() => {
    return credits.find((c) => c.id === selectedCreditId) || null;
  }, [credits, selectedCreditId]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchases/${id}`);
    },
    onSuccess: () => {
      notification.success('Vendor credit deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor-credits'] });
      setCreditToDelete(null);
      if (selectedCreditId === creditToDelete?.id) setSelectedCreditId(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete vendor credit');
    },
  });

  const views: ZohoViewOption[] = [
    { id: 'ALL', label: 'All Vendor Credits', count: credits.length },
    {
      id: 'OPEN',
      label: 'Open',
      count: credits.filter((c) => (c.status || 'OPEN').toUpperCase() === 'OPEN').length,
    },
    {
      id: 'CLOSED',
      label: 'Closed',
      count: credits.filter((c) => (c.status || '').toUpperCase() === 'CLOSED').length,
    },
  ];

  const filteredCredits = useMemo(() => {
    return credits.filter((c) => {
      const st = (c.status || 'OPEN').toUpperCase();
      if (activeView === 'OPEN') return st === 'OPEN';
      if (activeView === 'CLOSED') return st === 'CLOSED';
      return true;
    });
  }, [credits, activeView]);

  const splitItems = useMemo<ZohoSplitListItem[]>(() => {
    return filteredCredits.map((c) => ({
      id: c.id,
      name: c.vendor?.name || 'Unknown Vendor',
      amount: `₹${Number(c.grandTotal || c.amount || 0).toLocaleString('en-IN')}`,
      number: c.creditNoteNo || c.purchaseNo || `DN-${c.id.slice(-5)}`,
      date: c.date ? new Date(c.date).toLocaleDateString('en-GB') : '',
      status: (c.status || 'OPEN').toUpperCase(),
    }));
  }, [filteredCredits]);

  const columns: ZohoColumn<VendorCredit>[] = [
    {
      key: 'date',
      label: 'Date',
      width: '110px',
      render: (c) => (
        <span className="text-[#2B2F36] font-medium">
          {c.date ? new Date(c.date).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
    },
    {
      key: 'creditNoteNo',
      label: 'Credit Note#',
      width: '140px',
      render: (c) => (
        <span className="text-[#408DFB] hover:underline font-mono font-medium cursor-pointer">
          {c.creditNoteNo || c.purchaseNo || c.invoiceNo || `DN-${c.id.slice(-5)}`}
        </span>
      ),
    },
    {
      key: 'reference',
      label: 'Reference#',
      width: '130px',
      render: (c) => <span className="text-[#6B7280]">{c.reference || '-'}</span>,
    },
    {
      key: 'vendor',
      label: 'Vendor Name',
      render: (c) => (
        <span className="text-[#2B2F36] font-medium truncate block max-w-[200px]">
          {c.vendor?.name || 'Unknown Vendor'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (c) => <ZohoStatusText status={(c.status || 'OPEN').toUpperCase()} />,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      width: '120px',
      render: (c) => (
        <span className="font-semibold text-[#2B2F36] tabular-nums">
          ₹{(Number(c.grandTotal || c.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      width: '120px',
      render: (c) => (
        <span className="font-semibold text-[#2B2F36] tabular-nums">
          ₹{(Number(c.balance !== undefined ? c.balance : c.grandTotal || c.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none">
      <ZohoPageHeader
        title="All Vendor Credits"
        views={views}
        activeViewId={activeView}
        onViewChange={(vId) => setActiveView(vId)}
        newAction={{
          label: '+ New',
          onClick: () => navigate('/debit-notes/new'),
        }}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['vendor-credits'] })}
      />

      <div className="flex-1 overflow-hidden">
        {credits.length === 0 && !isLoading ? (
          // Exact Empty State from Prompt 05
          <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto select-none">
            <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4 text-[#408DFB]">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-[#2B2F36] mb-2">
              You deserve some credit too.
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-6">
              Create vendor credits and apply them to multiple bills when buying stuff from your vendor.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/debit-notes/new')}
                className="px-5 py-2 bg-[#408DFB] hover:bg-[#3078E0] text-white text-xs font-semibold rounded-[4px] cursor-pointer shadow-2xs tracking-wide"
              >
                CREATE VENDOR CREDITS
              </button>
              <button
                type="button"
                onClick={() => notification.info('Import Vendor Credits from CSV')}
                className="text-xs text-[#408DFB] hover:underline font-medium cursor-pointer"
              >
                Import Vendor Credits
              </button>
            </div>
          </div>
        ) : selectedCredit ? (
          <ZohoSplitDetail
            moduleTitle="All Vendor Credits"
            items={splitItems}
            selectedId={selectedCredit.id}
            onSelect={(id) => setSelectedCreditId(id)}
            onNew={() => navigate('/vendor-credits/new')}
            onClose={() => setSelectedCreditId(null)}
            detailTitle={selectedCredit.creditNoteNo || selectedCredit.purchaseNo || `Credit #${selectedCredit.id.slice(-5)}`}
            detailActions={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => notification.info('Apply vendor credit to open bills')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Apply to Bills</span>
                </button>
                <button
                  type="button"
                  onClick={() => notification.info('Record vendor credit refund')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Refund</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>PDF/Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreditToDelete(selectedCredit)}
                  className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                  title="Delete Vendor Credit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            }
          >
            <div className="p-6 space-y-6 max-w-4xl mx-auto text-xs text-[#2B2F36]">
              {/* Credit Note Header */}
              <div className="bg-white border border-[#CBD5E1] rounded-[4px] p-6 shadow-2xs space-y-4">
                <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#2B2F36] uppercase tracking-wide">
                      VENDOR CREDIT
                    </h2>
                    <p className="font-mono text-xs text-[#6B7280] mt-0.5">
                      {selectedCredit.creditNoteNo || selectedCredit.purchaseNo || `DN-${selectedCredit.id.slice(-5)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#6B7280] block">Vendor</span>
                    <span className="text-sm font-bold text-[#2B2F36]">{selectedCredit.vendor?.name || 'Unknown'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Date</span>
                    <span className="font-semibold">{selectedCredit.date ? new Date(selectedCredit.date).toLocaleDateString('en-GB') : '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Reference#</span>
                    <span className="font-semibold">{selectedCredit.reference || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Status</span>
                    <ZohoStatusText status={(selectedCredit.status || 'OPEN').toUpperCase()} />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E5E7EB]">
                  <div className="text-right">
                    <span className="text-xs text-[#6B7280] block">Credit Amount</span>
                    <span className="text-lg font-bold text-[#2B2F36]">
                      ₹{Number(selectedCredit.grandTotal || selectedCredit.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ZohoSplitDetail>
        ) : (
          <ZohoListTable
            columns={columns}
            data={filteredCredits}
            isLoading={isLoading}
            keyField="id"
            onRowClick={(c) => setSelectedCreditId(c.id)}
          />
        )}
      </div>

      {creditToDelete && (
        <DeleteDialog
          isOpen={!!creditToDelete}
          onClose={() => setCreditToDelete(null)}
          onConfirm={() => deleteMutation.mutate(creditToDelete.id)}
          entityName={`Vendor Credit ${creditToDelete.creditNoteNo || creditToDelete.purchaseNo || ''}`}
          warningText="Are you sure you want to delete this vendor credit? This action cannot be undone."
        />
      )}
    </div>
  );
};

export default VendorCreditsList;
