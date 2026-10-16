import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Edit,
  Printer,
  Trash2,
  Calendar,
  ChevronDown,
  CheckCircle,
  Eye,
  Plus,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { apiClient as api } from '@/core/api/apiClient';
import notification from '@/core/services/NotificationService';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoStatusText,
  ZohoViewOption,
  ZohoEmptyState,
} from '@/shared/components/zoho';
import { DeleteDialog } from '@/shared/components/ui';

import { useSessionStore } from '@/features/auth/stores/sessionStore';

interface JournalLine {
  id?: string;
  accountId: string;
  account?: { id: string; name: string; code?: string };
  debit?: number;
  credit?: number;
  description?: string;
  contactName?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  journalNo?: string;
  reference?: string;
  description?: string;
  notes?: string;
  status?: string;
  reportingMethod?: string;
  lines: JournalLine[];
  createdAt?: string;
}

type JournalView = 'ALL' | 'DRAFT' | 'PUBLISHED';

export const JournalVouchersList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = useSessionStore((state) => state.user?.companyId);

  const [activeView, setActiveView] = useState<string>('ALL');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [journalToDelete, setJournalToDelete] = useState<JournalEntry | null>(null);
  const [localDraftRevision, setLocalDraftRevision] = useState<number>(0);

  // Queries
  const { data: journalEntriesData, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const res = await api.get('/journal-entries');
      return res.data?.data || res.data || [];
    },
  });

  // Local drafts stored per tenant
  const localDrafts = useMemo<JournalEntry[]>(() => {
    if (!companyId) return [];
    try {
      const raw = localStorage.getItem(`billaura_manual_journal_drafts_${companyId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [companyId, localDraftRevision]);

  const journalEntries: JournalEntry[] = useMemo(() => {
    const serverEntries = Array.isArray(journalEntriesData) ? journalEntriesData : [];
    const normalizedServer = serverEntries.map((e: any) => ({
      ...e,
      status: e.status || 'PUBLISHED',
    }));
    return [...localDrafts, ...normalizedServer];
  }, [journalEntriesData, localDrafts]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/journal-entries/${id}`);
    },
    onSuccess: () => {
      notification.success('Journal entry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setSelectedJournalId(null);
      setJournalToDelete(null);
    },
    onError: (err: any) => {
      notification.error(err?.response?.data?.message || 'Failed to delete journal entry');
    },
  });

  const handleDeleteConfirm = (journal: JournalEntry) => {
    if (journal.status === 'DRAFT') {
      if (companyId) {
        try {
          const storageKey = `billaura_manual_journal_drafts_${companyId}`;
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const list = JSON.parse(raw);
            localStorage.setItem(storageKey, JSON.stringify(list.filter((d: any) => d.id !== journal.id)));
          }
        } catch {}
      }
      notification.success('Draft journal deleted successfully');
      setLocalDraftRevision((v) => v + 1);
      setSelectedJournalId(null);
      setJournalToDelete(null);
      return;
    }

    deleteMutation.mutate(journal.id);
  };

  const views: ZohoViewOption[] = [
    { id: 'ALL', label: 'All Manual Journals' },
    { id: 'DRAFT', label: 'Draft Journals' },
    { id: 'PUBLISHED', label: 'Published Journals' },
  ];

  const filteredJournals = useMemo(() => {
    return journalEntries.filter((j) => {
      const st = (j.status || 'PUBLISHED').toUpperCase();
      if (activeView === 'DRAFT') return st === 'DRAFT';
      if (activeView === 'PUBLISHED') return st === 'PUBLISHED';
      return true;
    });
  }, [journalEntries, activeView]);

  const selectedJournal = useMemo(() => {
    if (!selectedJournalId) return null;
    return journalEntries.find((j) => j.id === selectedJournalId) || null;
  }, [journalEntries, selectedJournalId]);

  const formatCurrency = (amount: number | string | undefined | null) => {
    const num = Number(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB'); // dd/mm/yyyy
    } catch {
      return dateStr;
    }
  };

  const getEntryTotal = (j: JournalEntry) => {
    return j.lines?.reduce((sum, l) => sum + Number(l.debit || 0), 0) || 0;
  };

  const splitItems = useMemo<ZohoSplitListItem[]>(() => {
    return filteredJournals.map((j) => ({
      id: j.id,
      name: j.description || j.notes || 'Manual Journal',
      amount: formatCurrency(getEntryTotal(j)),
      number: j.journalNo || `JN-${j.id.slice(-5)}`,
      date: formatDate(j.date),
      status: (j.status || 'PUBLISHED').toUpperCase(),
    }));
  }, [filteredJournals]);

  // Columns definition: Date, Journal#, Reference#, Status (DRAFT / PUBLISHED), Notes, Amount
  const columns: ZohoColumn<JournalEntry>[] = [
    {
      key: 'date',
      label: 'Date',
      width: '110px',
      render: (j) => (
        <span className="text-[#2B2F36] font-medium">{formatDate(j.date)}</span>
      ),
    },
    {
      key: 'journalNo',
      label: 'Journal#',
      width: '140px',
      render: (j) => (
        <span className="text-[#408DFB] hover:underline font-mono font-medium cursor-pointer">
          {j.journalNo || `JN-${j.id.slice(-5)}`}
        </span>
      ),
    },
    {
      key: 'reference',
      label: 'Reference#',
      width: '130px',
      render: (j) => <span className="text-[#6B7280]">{j.reference || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (j) => <ZohoStatusText status={(j.status || 'PUBLISHED').toUpperCase()} />,
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (j) => (
        <span className="text-[#6B7280] truncate block max-w-[280px]">
          {j.notes || j.description || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      width: '130px',
      render: (j) => (
        <span className="font-semibold text-[#2B2F36] tabular-nums">
          {formatCurrency(getEntryTotal(j))}
        </span>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none">
      <ZohoPageHeader
        title="All Manual Journals"
        views={views}
        activeViewId={activeView}
        onViewChange={(vId) => setActiveView(vId)}
        newAction={{
          label: '+ New Journal',
          onClick: () => navigate('/journal-entries/new'),
        }}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['journal-entries'] })}
      />

      <div className="flex-1 overflow-hidden">
        {selectedJournal ? (
          <ZohoSplitDetail
            moduleTitle="All Manual Journals"
            items={splitItems}
            selectedId={selectedJournal.id}
            onSelect={(id) => setSelectedJournalId(id)}
            onNew={() => navigate('/journal-entries/new')}
            onClose={() => setSelectedJournalId(null)}
            detailTitle={selectedJournal.journalNo || `Journal #${selectedJournal.id.slice(-5)}`}
            detailActions={
              <div className="flex items-center gap-1.5">
                {selectedJournal.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/journal-entries/new?draftId=${selectedJournal.id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#408DFB] hover:bg-[#3078E0] rounded-[4px] text-xs font-semibold text-white cursor-pointer shadow-2xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Draft</span>
                  </button>
                )}
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
                  onClick={() => setJournalToDelete(selectedJournal)}
                  className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                  title="Delete Journal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            }
          >
            <div className="p-6 space-y-6 max-w-4xl mx-auto text-xs text-[#2B2F36]">
              {/* Journal Card Header */}
              <div className="bg-white border border-[#CBD5E1] rounded-[4px] p-6 shadow-2xs space-y-4">
                <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#2B2F36] uppercase tracking-wide">
                      MANUAL JOURNAL
                    </h2>
                    <p className="font-mono text-xs text-[#6B7280] mt-0.5">
                      {selectedJournal.journalNo || `JN-${selectedJournal.id.slice(-5)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase text-[#6B7280] block font-medium">Status</span>
                    <ZohoStatusText status={(selectedJournal.status || 'PUBLISHED').toUpperCase()} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Date</span>
                    <span className="font-semibold text-[#1E2540]">{formatDate(selectedJournal.date)}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Reference#</span>
                    <span className="font-semibold text-[#1E2540]">{selectedJournal.reference || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Reporting Method</span>
                    <span className="font-semibold text-[#1E2540]">
                      {selectedJournal.reportingMethod || 'Accrual and Cash'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[#6B7280] block text-[11px]">Notes</span>
                  <p className="text-xs text-[#1E2540] mt-0.5 whitespace-pre-wrap">
                    {selectedJournal.notes || selectedJournal.description || '—'}
                  </p>
                </div>

                {/* Double Entry Lines Table */}
                <div className="pt-2">
                  <div className="border border-[#CBD5E1] rounded-[4px] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F8F9FB] border-b border-[#CBD5E1] text-[#6B7280] text-left font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Account</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3 text-right">Debits</th>
                          <th className="py-2.5 px-3 text-right">Credits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {(selectedJournal.lines || []).map((l, idx) => (
                          <tr key={idx} className="hover:bg-[#F9FAFB]">
                            <td className="py-2.5 px-3 font-medium text-[#1E2540]">
                              {l.account?.name || 'General Ledger Account'}
                            </td>
                            <td className="py-2.5 px-3 text-[#6B7280]">
                              {l.description || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[#6B7280]">
                              {l.contactName || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-[#1E2540] font-medium">
                              {Number(l.debit || 0) > 0 ? formatCurrency(l.debit) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-[#1E2540] font-medium">
                              {Number(l.credit || 0) > 0 ? formatCurrency(l.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#F8F9FB] font-bold border-t border-[#CBD5E1]">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 text-right text-[#1E2540]">
                            Total (₹)
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-[#1E2540]">
                            {formatCurrency(getEntryTotal(selectedJournal))}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-[#1E2540]">
                            {formatCurrency(
                              selectedJournal.lines?.reduce((sum, l) => sum + Number(l.credit || 0), 0) || 0
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </ZohoSplitDetail>
        ) : (
          <ZohoListTable
            columns={columns}
            data={filteredJournals}
            isLoading={isLoading}
            keyField="id"
            onRowClick={(j) => setSelectedJournalId(j.id)}
            emptyState={
              <ZohoEmptyState
                title="Post double-entry manual journal vouchers."
                description="Record adjusting entries, depreciation, compound entries, and direct ledger balances."
                createLabel="Create New Journal"
                onCreate={() => navigate('/journal-entries/new')}
              />
            }
          />
        )}
      </div>

      {journalToDelete && (
        <DeleteDialog
          isOpen={!!journalToDelete}
          onClose={() => setJournalToDelete(null)}
          onConfirm={() => handleDeleteConfirm(journalToDelete)}
          entityName={`Journal #${journalToDelete.journalNo || journalToDelete.id.slice(-5)}`}
          warningText={
            journalToDelete.status === 'DRAFT'
              ? 'Are you sure you want to discard this draft journal? This will delete the draft.'
              : 'Are you sure you want to delete this manual journal? This will reverse the posted accounting impacts.'
          }
        />
      )}
    </div>
  );
};

export default JournalVouchersList;
