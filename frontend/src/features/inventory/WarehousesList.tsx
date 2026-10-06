import React, { useState, useMemo } from 'react';
import { Plus, Search, Building2, Edit2, Trash2, Loader2, X, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge, Button } from '@/shared/components/ui';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const WarehousesList = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rawData, isLoading: loading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      return res.data;
    }
  });

  const warehouses = useMemo(() => {
    const items = rawData?.data?.items || rawData?.items || rawData?.data || rawData || [];
    return Array.isArray(items) ? items : [];
  }, [rawData]);

  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return warehouses;
    const query = searchQuery.toLowerCase();
    return warehouses.filter((w: any) => 
      w.name?.toLowerCase().includes(query) || 
      w.location?.toLowerCase().includes(query)
    );
  }, [warehouses, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setLocation('');
    setIsDefault(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (warehouse: any) => {
    setEditingId(warehouse.id);
    setName(warehouse.name || '');
    setLocation(warehouse.location || '');
    setIsDefault(Boolean(warehouse.isDefault));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notification.error('Warehouse name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await apiClient.patch(`/warehouses/${editingId}`, {
          name,
          location,
          isDefault,
        });
        notification.success('Warehouse updated successfully');
      } else {
        await apiClient.post('/warehouses', {
          name,
          location,
          isDefault,
        });
        notification.success('Warehouse created successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setIsModalOpen(false);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to save warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (warehouse: any) => {
    if (warehouse.isDefault) {
      notification.error('Cannot delete the default warehouse');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete warehouse "${warehouse.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/warehouses/${warehouse.id}`);
      notification.success('Warehouse deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to delete warehouse');
    }
  };

  return (
    <PageContainer maxWidth="full" className="w-full space-y-4">
      <div className="w-full max-w-[1280px] space-y-4 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent shrink-0" />
              Warehouses
              {warehouses.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                  {warehouses.length}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage physical storage locations, fulfillment centers, and stock facilities
            </p>
          </div>
          <Button onClick={handleOpenAddModal} variant="primary" size="sm" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> New Warehouse
          </Button>
        </div>

        {/* Search Toolbar */}
        <div className="w-full sm:w-[360px] max-w-full">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border focus-within:border-accent transition-colors shadow-2xs">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input 
              type="text" 
              placeholder="Search warehouses by name or location..." 
              className="bg-transparent border-none outline-hidden w-full text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <Table containerClassName="w-full rounded-xl border border-border shadow-2xs overflow-hidden">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%] min-w-[200px] pl-5 pr-4">Warehouse Name</TableHead>
              <TableHead className="w-[30%] min-w-[160px] px-4">Location / Address</TableHead>
              <TableHead className="w-[15%] min-w-[120px] px-4">Default Warehouse</TableHead>
              <TableHead className="w-[10%] min-w-[100px] px-4">Status</TableHead>
              <TableHead className="w-[10%] min-w-[100px] pr-5 pl-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <TableLoader rows={4} />
                </TableCell>
              </TableRow>
            ) : filteredWarehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  {searchQuery ? 'No warehouses match your search.' : 'No warehouses registered yet.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredWarehouses.map((warehouse: any) => (
                <TableRow key={warehouse.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{warehouse.name}</span>
                      {warehouse.isDefault && (
                        <span className="bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-xs sm:text-sm text-muted-foreground">
                    {warehouse.location || '—'}
                  </TableCell>
                  <TableCell className="px-4 text-xs sm:text-sm">
                    {warehouse.isDefault ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Primary
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusBadge status={warehouse.isActive !== false ? 'ACTIVE' : 'INACTIVE'} />
                  </TableCell>
                  <TableCell className="pr-5 pl-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEditModal(warehouse)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
                        title="Edit Warehouse"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(warehouse)}
                        disabled={warehouse.isDefault}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                        title={warehouse.isDefault ? "Cannot delete default warehouse" : "Delete Warehouse"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md z-10 overflow-hidden text-foreground">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                {editingId ? 'Edit Warehouse' : 'New Warehouse'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Warehouse Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Central Distribution Hub"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:border-accent outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Location / Address
                  </label>
                  <textarea
                    rows={2}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Industrial Area Phase 2, Mumbai"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:border-accent outline-hidden resize-none"
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                  />
                  <span className="text-xs font-medium text-foreground">Set as Default Warehouse</span>
                </label>
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-2.5 bg-muted/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
