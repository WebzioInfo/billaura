import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Search, X, Users, Building2, Phone, Mail } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/shared/components/ui';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui';

export const CustomersList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const { data: crm = [], isLoading: loading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      notification.success('Customer deleted successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete customer');
    }
  });

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Customer?',
      `Are you sure you want to delete customer "${name}"? This action cannot be undone.`
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

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

      const matchesType =
        selectedType === 'ALL' ||
        (c.customerType && c.customerType.toUpperCase() === selectedType.toUpperCase());

      return matchesSearch && matchesType;
    });
  }, [crm, searchTerm, selectedType]);

  const customerTypes = useMemo(() => {
    const types = new Set<string>();
    crm.forEach((c: any) => {
      if (c.customerType) types.add(c.customerType);
    });
    return Array.from(types);
  }, [crm]);

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Customers"
        description="Manage your customer registry, billing accounts, and credit limits"
        primaryAction={
          <Button
            onClick={() => navigate('/customers/new')}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, code, GST, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {customerTypes.length > 0 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Types</option>
              {customerTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border">
            Total: {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Customer' : 'Customers'}
          </span>
        </div>
      </div>

      {loading ? (
        <TableLoader cols={5} rows={5} className="mt-4 border border-border/80 bg-surface rounded-xl" />
      ) : crm.length === 0 ? (
        <div className="mt-4 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Customers Found"
            description="Manage your client list and billing relationships by adding your first customer."
            actionLabel="Add First Customer"
            onActionClick={() => navigate('/customers/new')}
          />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="mt-4 bg-surface rounded-xl border border-border shadow-sm p-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-foreground">No customers match your search</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your keyword or filter criteria.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setSelectedType('ALL');
            }}
            className="mt-3 text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-xl overflow-hidden mt-4 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 border-b border-border">
                <TableHead className="font-bold text-xs">Code</TableHead>
                <TableHead className="font-bold text-xs">Customer Name</TableHead>
                <TableHead className="font-bold text-xs">Trade Name / GSTIN</TableHead>
                <TableHead className="font-bold text-xs">Contact Details</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-muted/40 border-b border-border/60 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                    {c.bpCode || '-'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="font-semibold text-foreground hover:text-primary hover:underline text-left cursor-pointer transition"
                    >
                      {c.name}
                    </button>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {c.customerType && (
                        <span className="inline-block text-[10px] uppercase font-medium bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">
                          {c.customerType}
                        </span>
                      )}
                      {c.customerSegment && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium text-white ${c.customerSegment.color || 'bg-slate-500'}`}>
                          {c.customerSegment.name}
                        </span>
                      )}
                      {c.customerDepartment && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium text-primary bg-primary/10 border border-primary/20">
                          {c.customerDepartment.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{c.tradeName || '-'}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.gstin || 'No GSTIN'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm flex items-center gap-1.5">
                      {c.email ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{c.email}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    {c.phone && (
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 h-7"
                        title="View Profile"
                        onClick={() => navigate(`/customers/${c.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 h-7"
                        title="Edit Customer"
                        onClick={() => navigate(`/customers/${c.id}/edit`)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Customer"
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageContainer>
  );
};
