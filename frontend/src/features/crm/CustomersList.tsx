import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/components/ui';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const CustomersList = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields state
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    email: '',
    mobile: '',
    gstin: '',
    address: '',
    notes: '',
  });

  const { data: crm = [], isLoading: loading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      setIsModalOpen(false);
      setFormData({
        name: '',
        tradeName: '',
        email: '',
        mobile: '',
        gstin: '',
        address: '',
        notes: '',
      });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create customer');
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Customer Name is required');
      return;
    }
    createMutation.mutate(formData);
  };

  const isSubmitting = createMutation.isPending;

  return (
    <div className="p-8 max-w-[1600px] mx-auto text-foreground">
      <div className="relative">
        <PageHeader
          title="Customers"
          description="Manage your customers and clients" 
          primaryAction={
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm cursor-pointer hover:bg-opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" /> New Customer
            </button>
          }
        />
        {loading ? (
          <TableLoader cols={4} rows={5} className="mt-6 border border-border/80 bg-surface rounded-2xl animate-fade-in" />
        ) : crm.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center p-12 text-center bg-surface border border-border rounded-2xl shadow-sm space-y-3">
            <div className="p-3 bg-muted/30 text-muted-foreground rounded-full">
              <Loader2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">No Customers Found</h3>
              <p className="text-xs text-muted-foreground">Manage your client list and billing relationships by adding your first customer.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-accent/20 cursor-pointer hover:bg-opacity-95 transition-all mt-1"
            >
              Add First Customer
            </button>
          </div>
        ) : (
          <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-b border-border">
                  <TableHead className="font-bold">Name</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="font-bold">Phone</TableHead>
                  <TableHead className="font-bold">Company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crm.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                    <TableCell className="font-semibold text-foreground">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">{c.phone || '-'}</TableCell>
                    <TableCell className="text-foreground">{c.tradeName || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Customer Creation Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            
            <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
                <h2 className="font-bold text-lg text-foreground">Add New Customer</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-left max-h-[75vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Acme Corporation"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Company</label>
                    <input
                      type="text"
                      name="tradeName"
                      value={formData.tradeName}
                      onChange={handleInputChange}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="billing@acme.com"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone</label>
                      <input
                        type="text"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        placeholder="+91 99999 99999"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">GST Number</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleInputChange}
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter complete billing details..."
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Internal customer notes..."
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-accent text-white hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

