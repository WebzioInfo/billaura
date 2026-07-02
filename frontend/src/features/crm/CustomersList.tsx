import React, { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { toast } from 'sonner';

export const CustomersList = () => {
  const [crm, setCrm] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get('/customers');
      const items = res.data?.data?.items || res.data?.items || res.data?.data || res.data || [];
      setCrm(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

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
    setIsSubmitting(true);
    try {
      await apiClient.post('/customers', {
        name: formData.name,
        tradeName: formData.tradeName,
        email: formData.email,
        mobile: formData.mobile,
        gstin: formData.gstin,
        address: formData.address,
        notes: formData.notes,
      });
      toast.success('Customer created successfully');
      setIsModalOpen(false);
      // Reset form
      setFormData({
        name: '',
        tradeName: '',
        email: '',
        mobile: '',
        gstin: '',
        address: '',
        notes: '',
      });
      // Refresh list
      setLoading(true);
      await fetchCustomers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4}><div className="text-center py-8">Loading...</div></TableCell></TableRow>
            ) : crm.length === 0 ? (
              <TableRow><TableCell colSpan={4}><div className="text-center py-8">No customers found</div></TableCell></TableRow>
            ) : crm.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell>{c.phone || '-'}</TableCell>
                <TableCell>{c.tradeName || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
