import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoColumn,
  ZohoEmptyState,
} from '@/shared/components/zoho';
import { ExportService } from '@/core/services/ExportService';

export const VendorsList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: vendorsData, isLoading: loading } = useQuery({
    queryKey: ['vendors', searchTerm, activeView],
    queryFn: async () => {
      const res = await apiClient.get('/vendors', {
        params: {
          search: searchTerm || undefined,
          status: activeView === 'ALL' ? undefined : activeView,
        },
      });
      const items = res.data?.data?.items || res.data?.items || (Array.isArray(res.data?.data) ? res.data.data : res.data) || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return Promise.all(ids.map((id) => apiClient.delete(`/vendors/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      notification.success('Vendor(s) deleted successfully');
      setSelectedIds([]);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete vendor');
    },
  });

  const handleDelete = async (ids: string[]) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Vendor(s)?',
      `Are you sure you want to delete ${ids.length} selected vendor(s)? This action cannot be undone.`
    );
    if (confirmed) {
      deleteMutation.mutate(ids);
    }
  };

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return vendors.slice(start, start + pageSize);
  }, [vendors, page, pageSize]);

  // Export CSV
  const handleExport = () => {
    if (vendors.length === 0) {
      notification.warning('No vendors to export');
      return;
    }
    const headers = [
      'Name',
      'Company Name',
      'Email',
      'Work Phone',
      'Source of Supply',
      'Payables',
      'Unused Credits',
    ];
    const rows = vendors.map((v: any) => ({
      Name: v.name || '',
      'Company Name': v.companyName || v.tradeName || '',
      Email: v.email || '',
      'Work Phone': v.phone || v.mobile || '',
      'Source of Supply': v.placeOfSupply || v.state || '',
      Payables: v.balance || v.outstandingBalance || 0,
      'Unused Credits': v.unusedCredits || 0,
    }));
    ExportService.exportCsv('Vendors_List.csv', rows, headers);
  };

  // Columns per Prompt 02: Name, Company Name, Email, Work Phone, Source of Supply, Payables (BCY), Unused Credits (BCY)
  const columns: ZohoColumn<any>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'NAME',
        isPrimary: true,
        width: '220px',
        render: (row) => (
          <span
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/vendors/${row.id}`);
            }}
            className="text-[#408DFB] hover:underline font-medium cursor-pointer truncate block"
          >
            {row.name || 'Unnamed Vendor'}
          </span>
        ),
      },
      {
        key: 'companyName',
        label: 'COMPANY NAME',
        width: '180px',
        render: (row) => (
          <span className="text-[#2B2F36] truncate block">
            {row.companyName || row.tradeName || '—'}
          </span>
        ),
      },
      {
        key: 'email',
        label: 'EMAIL',
        width: '200px',
        render: (row) => (
          <span className="text-[#6B7280] truncate block">
            {row.email || '—'}
          </span>
        ),
      },
      {
        key: 'phone',
        label: 'WORK PHONE',
        width: '140px',
        render: (row) => (
          <span className="text-[#6B7280] tabular-nums truncate block">
            {row.phone || row.mobile || '—'}
          </span>
        ),
      },
      {
        key: 'sourceOfSupply',
        label: 'SOURCE OF SUPPLY',
        width: '150px',
        render: (row) => (
          <span className="text-[#6B7280] truncate block">
            {row.placeOfSupply || row.state || '—'}
          </span>
        ),
      },
      {
        key: 'payables',
        label: 'PAYABLES (BCY)',
        align: 'right',
        isNumeric: true,
        width: '150px',
        render: (row) => {
          const val = Number(row.balance || row.outstandingBalance || 0);
          return (
            <span className="font-medium text-[#2B2F36] tabular-nums">
              ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        key: 'unusedCredits',
        label: 'UNUSED CREDITS (BCY)',
        align: 'right',
        isNumeric: true,
        width: '160px',
        render: (row) => {
          const val = Number(row.unusedCredits || 0);
          return (
            <span className="text-[#6B7280] tabular-nums">
              ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          );
        },
      },
    ],
    [navigate]
  );

  const VIEWS = [
    { id: 'ACTIVE', label: 'Active Vendors' },
    { id: 'ALL', label: 'All Vendors' },
    { id: 'INACTIVE', label: 'Inactive Vendors' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      {/* 1. Zoho List Page Header */}
      <ZohoPageHeader
        title="Active Vendors"
        views={VIEWS}
        activeViewId={activeView}
        onViewChange={(vId) => {
          setActiveView(vId);
          setPage(1);
        }}
        newAction={{
          label: 'New',
          onClick: () => navigate('/vendors/new'),
        }}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['vendors'] })}
        onExport={handleExport}
      />

      {/* 2. Zoho List Table Area */}
      <div className="flex-1 p-4 overflow-hidden min-h-0 bg-white">
        <ZohoListTable
          columns={columns}
          data={paginatedData}
          keyField="id"
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onRowClick={(row) => navigate(`/vendors/${row.id}`)}
          isLoading={loading}
          searchPlaceholder="Search in Vendors (Name, Company, GSTIN, Phone)..."
          onSearchChange={setSearchTerm}
          bulkActions={[
            {
              label: 'Delete',
              icon: Trash2,
              variant: 'danger',
              onClick: (ids) => handleDelete(ids),
            },
          ]}
          pagination={{
            currentPage: page,
            pageSize,
            totalCount: vendors.length,
            onPageChange: setPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setPage(1);
            },
          }}
          emptyState={
            <ZohoEmptyState
              title="No Vendors Yet"
              description="Keep track of your suppliers, purchase bills, and payables in one place."
              createLabel="NEW VENDOR"
              onCreate={() => navigate('/vendors/new')}
            />
          }
        />
      </div>
    </div>
  );
};
