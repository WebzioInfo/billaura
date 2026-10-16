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

export const CustomersList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: crm = [], isLoading: loading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      const items = res.data?.data?.items || res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return Promise.all(ids.map((id) => apiClient.delete(`/customers/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      notification.success('Customer(s) deleted successfully');
      setSelectedIds([]);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete customer');
    },
  });

  const handleDelete = async (ids: string[]) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Customer(s)?',
      `Are you sure you want to delete ${ids.length} selected customer(s)? This action cannot be undone.`
    );
    if (confirmed) {
      deleteMutation.mutate(ids);
    }
  };

  // View filtering & search
  const filteredCustomers = useMemo(() => {
    return crm.filter((c: any) => {
      const matchesSearch =
        !searchTerm ||
        (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.bpCode && c.bpCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesView = true;
      if (activeView === 'ACTIVE') {
        matchesView = c.status !== 'INACTIVE';
      } else if (activeView === 'INACTIVE') {
        matchesView = c.status === 'INACTIVE';
      }

      return matchesSearch && matchesView;
    });
  }, [crm, searchTerm, activeView]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  // Export CSV
  const handleExport = () => {
    if (filteredCustomers.length === 0) {
      notification.warning('No customers to export');
      return;
    }
    const headers = [
      'Name',
      'Company Name',
      'Email',
      'Work Phone',
      'Place of Supply',
      'Receivables',
      'Unused Credits',
    ];
    const rows = filteredCustomers.map((c: any) => ({
      Name: c.name || '',
      'Company Name': c.tradeName || c.companyName || '',
      Email: c.email || '',
      'Work Phone': c.phone || c.mobile || '',
      'Place of Supply': c.placeOfSupply || c.state || '',
      Receivables: c.balance || c.outstandingBalance || 0,
      'Unused Credits': c.unusedCredits || 0,
    }));
    ExportService.exportCsv('Customers_List.csv', rows, headers);
  };

  // Columns per Prompt 02: Name (blue link), Company Name, Email, Work Phone, Place of Supply, Receivables (BCY, right aligned), Unused Credits (BCY, right aligned)
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
              navigate(`/customers/${row.id}`);
            }}
            className="text-[#408DFB] hover:underline font-medium cursor-pointer truncate block"
          >
            {row.name || 'Unnamed'}
          </span>
        ),
      },
      {
        key: 'companyName',
        label: 'COMPANY NAME',
        width: '180px',
        render: (row) => (
          <span className="text-[#2B2F36] truncate block">
            {row.tradeName || row.companyName || '—'}
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
        key: 'placeOfSupply',
        label: 'PLACE OF SUPPLY',
        width: '150px',
        render: (row) => (
          <span className="text-[#6B7280] truncate block">
            {row.placeOfSupply || row.state || '—'}
          </span>
        ),
      },
      {
        key: 'receivables',
        label: 'RECEIVABLES (BCY)',
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
    { id: 'ACTIVE', label: 'Active Customers' },
    { id: 'ALL', label: 'All Customers' },
    { id: 'INACTIVE', label: 'Inactive Customers' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      {/* 1. Zoho List Page Header */}
      <ZohoPageHeader
        title="Active Customers"
        views={VIEWS}
        activeViewId={activeView}
        onViewChange={(vId) => {
          setActiveView(vId);
          setPage(1);
        }}
        newAction={{
          label: 'New',
          onClick: () => navigate('/customers/new'),
        }}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
        onExport={handleExport}
      />

      {/* 2. Zoho List Table Area (Only Table Scrolls) */}
      <div className="flex-1 p-4 overflow-hidden min-h-0 bg-white">
        <ZohoListTable
          columns={columns}
          data={paginatedData}
          keyField="id"
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          isLoading={loading}
          searchPlaceholder="Search in Customers (Name, Company, GSTIN, Phone)..."
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
            totalCount: filteredCustomers.length,
            onPageChange: setPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setPage(1);
            },
          }}
          emptyState={
            <ZohoEmptyState
              title="No Customers Yet"
              description="Keep track of your clients, their contact information, and billing receivables in one place."
              createLabel="NEW CUSTOMER"
              onCreate={() => navigate('/customers/new')}
            />
          }
        />
      </div>
    </div>
  );
};
