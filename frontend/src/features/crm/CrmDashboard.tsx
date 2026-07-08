import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  Users, Search, Plus, Edit2, Trash2, 
  Phone, Mail, Calendar, Loader2, TrendingUp, Check, Briefcase, Eye 
} from 'lucide-react';
import api from '../../services/api';
import { DeleteDialog } from '../../components/ui';
import { CustomerDetailModal } from './CustomerDetailModal';
import { useQueryClient } from '@tanstack/react-query';
import { useApiList } from '../../hooks/useApiList';

// --- SCHEMAS ---
const customerSchema = z.object({
  customerCode: z.string().min(1, 'Customer code is required'),
  name: z.string().min(2, 'Name is too short'),
  mobile: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.string().length(0)),
  gstin: z.string().optional(),
  panNumber: z.string().optional(),
  customerType: z.enum(['REGISTERED', 'UNREGISTERED', 'COMPOSITION', 'SEZ', 'EXPORT']),
  tradeName: z.string().optional(),
  address: z.string().optional(),
  pinCode: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  placeOfSupply: z.string().optional(),
  creditLimit: z.number().optional(),
});

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.string().length(0)),
  phone: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']),
  source: z.enum(['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'OTHER']),
  value: z.number().optional(),
  notes: z.string().optional(),
});

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.string().length(0)),
  phone: z.string().optional(),
  designation: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
});

const activitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE']),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;
type LeadFormValues = z.infer<typeof leadSchema>;
type ContactFormValues = z.infer<typeof contactSchema>;
type ActivityFormValues = z.infer<typeof activitySchema>;

// --- TYPES ---
interface Customer {
  id: string;
  customerCode: string;
  name: string;
  email?: string;
  mobile?: string;
  customerType: 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'EXPORT';
  outstandingAmount?: number;
  tradeName?: string;
  gstin?: string;
  creditLimit?: number;
}

interface Lead {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  status: string;
  source: string;
  value?: number;
  phone?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  designation?: string;
  customer?: { name: string };
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
  lead?: { name: string };
  customer?: { name: string };
}

export const CrmDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Derive active tab from URL path
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  let activeTab: 'customers' | 'leads' | 'contacts' | 'activities' = 'customers';
  if (path.includes('/crm')) activeTab = 'leads';
  if (path.includes('/customers')) activeTab = 'customers';
  if (tabParam === 'contacts') activeTab = 'contacts';
  if (tabParam === 'activities') activeTab = 'activities';
  // Note: /contacts and /activities routes are not defined directly in core sidebar, they act as sub-tabs
  
  const setActiveTab = (tab: string) => navigate(tab === 'customers' ? '/customers' : tab === 'leads' ? '/crm' : `/customers?tab=${tab}`);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: customers = [], isLoading: isLoadingCustomers } = useApiList<Customer>(['customers'], '/customers');
  const { data: leads = [], isLoading: isLoadingLeads } = useApiList<Lead>(['leads'], '/crm/leads');
  const { data: contacts = [], isLoading: isLoadingContacts } = useApiList<Contact>(['contacts'], '/crm/contacts');
  const { data: activities = [], isLoading: isLoadingActivities } = useApiList<Activity>(['activities'], '/crm/activities');

  const isLoading = isLoadingCustomers || isLoadingLeads || isLoadingContacts || isLoadingActivities;
  const queryClient = useQueryClient();

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Ledger/Ageing Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Forms hooks
  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { customerCode: '', name: '', mobile: '', whatsapp: '', email: '', gstin: '', panNumber: '', customerType: 'UNREGISTERED', tradeName: '', address: '', pinCode: '', state: '', stateCode: '', placeOfSupply: '', creditLimit: 0 }
  });

  const leadForm = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: '', companyName: '', email: '', phone: '', status: 'NEW', source: 'WEBSITE', value: 0, notes: '' }
  });

  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', designation: '', customerId: '', vendorId: '' }
  });

  const activityForm = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: 'CALL', subject: '', description: '', dueDate: new Date().toISOString().split('T')[0], leadId: '', customerId: '' }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: [activeTab] });
  }, [activeTab]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    customerForm.reset();
    leadForm.reset();
    contactForm.reset();
    activityForm.reset();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'customers') {
      customerForm.reset({
        customerCode: item.customerCode,
        name: item.name,
        mobile: item.mobile || '',
        whatsapp: item.whatsapp || '',
        email: item.email || '',
        gstin: item.gstin || '',
        panNumber: item.panNumber || '',
        customerType: item.customerType || 'UNREGISTERED',
        tradeName: item.tradeName || '',
        address: item.address || '',
        pinCode: item.pinCode || '',
        state: item.state || '',
        stateCode: item.stateCode || '',
        placeOfSupply: item.placeOfSupply || '',
        creditLimit: Number(item.creditLimit || 0),
      });
    } else if (activeTab === 'leads') {
      leadForm.reset({
        name: item.name,
        companyName: item.companyName || '',
        email: item.email || '',
        phone: item.phone || '',
        status: item.status,
        source: item.source || '',
        value: Number(item.value || 0),
        notes: item.notes || '',
      });
    } else if (activeTab === 'contacts') {
      contactForm.reset({
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email || '',
        phone: item.phone || '',
        designation: item.designation || '',
        customerId: item.customerId || '',
        vendorId: item.vendorId || '',
      });
    } else {
      activityForm.reset({
        type: item.type,
        subject: item.subject,
        description: item.description || '',
        dueDate: item.dueDate ? item.dueDate.split('T')[0] : '',
        leadId: item.leadId || '',
        customerId: item.customerId || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const handleCustomerSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/customers/${editingId}`, values);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', values);
        toast.success('Customer registered successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeadSubmit = async (values: LeadFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/crm/leads/${editingId}`, values);
        toast.success('Lead updated successfully');
      } else {
        await api.post('/crm/leads', values);
        toast.success('Lead created successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/crm/contacts/${editingId}`, values);
        toast.success('Contact updated successfully');
      } else {
        await api.post('/crm/contacts', values);
        toast.success('Contact created successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivitySubmit = async (values: ActivityFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/crm/activities/${editingId}`, values);
        toast.success('Activity updated successfully');
      } else {
        await api.post('/crm/activities', values);
        toast.success('Activity created successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    const items = activeTab === 'customers' ? customers : activeTab === 'leads' ? leads : activeTab === 'contacts' ? contacts : activities;
    const found = (items as any[]).find(i => i.id === id);
    setItemToDelete(found || { id, _activeTab: activeTab });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const tab = itemToDelete._activeTab || activeTab;
      const endpoint = tab === 'customers' ? '/customers' : tab === 'leads' ? '/crm/leads' : tab === 'contacts' ? '/crm/contacts' : '/crm/activities';
      await api.delete(`${endpoint}/${itemToDelete.id}`);
      toast.success('Item deleted successfully');
      queryClient.invalidateQueries({ queryKey: [tab] });
    } catch { toast.error('Deletion failed'); } finally { setItemToDelete(null); }
  };

  const toggleActivityCompletion = async (act: Activity) => {
    try {
      await api.patch(`/crm/activities/${act.id}`, { isCompleted: !act.isCompleted });
      toast.success(act.isCompleted ? 'Task marked incomplete' : 'Task completed successfully');
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    } catch {
      toast.error('Failed to update activity status');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Outstanding balance calculation
  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstandingAmount || 0), 0);
  const totalPipelineValue = leads.reduce((sum, l) => sum + Number(l.value || 0), 0);

  return (
    <>
    <div className="space-y-6 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            {activeTab === 'customers' ? 'Customer Directory & Relations' : 'CRM Pipeline & Contacts'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'customers' 
              ? 'Manage registered business clients, credit limits, outstanding balances, and GST registry profiles.'
              : 'Manage prospective leads, track customer follow-up actions, and view the pipeline health.'}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'customers' ? 'Add Customer' : activeTab === 'leads' ? 'Add Prospect Lead' : activeTab === 'contacts' ? 'Add Contact' : 'Schedule Activity'}
        </button>
      </div>
 
      {/* KPI Cards Row */}
      {activeTab === 'leads' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass-panel p-3 rounded-lg border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground leading-none">{formatCurrency(totalPipelineValue)}</h3>
              <div className="p-1 bg-accent/10 text-accent rounded">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Weight</span>
            </div>
          </div>
          <div className="glass-panel p-3 rounded-lg border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground leading-none">{leads.filter(l => l.status !== 'LOST').length}</h3>
              <div className="p-1 bg-accent/10 text-accent rounded">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">Active Leads</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass-panel p-3 rounded-lg border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground leading-none">{formatCurrency(totalOutstanding)}</h3>
              <div className="p-1 bg-accent/10 text-accent rounded">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Balance</span>
            </div>
          </div>
          <div className="glass-panel p-3 rounded-lg border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground leading-none">{customers.length}</h3>
              <div className="p-1 bg-accent/10 text-accent rounded">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">Total Customers</span>
            </div>
          </div>
        </div>
      )}
 
      {/* Tabs Row */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab('customers'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'customers' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Customer Directory
        </button>
        <button
          onClick={() => { setActiveTab('leads'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'leads' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Prospective Leads
        </button>
        <button
          onClick={() => { setActiveTab('contacts'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'contacts' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Business Contacts
        </button>
        <button
          onClick={() => { setActiveTab('activities'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'activities' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Activities & Tasks
        </button>
      </div>
 
      {/* Search Input Filter */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder={`Search ${activeTab}...`} 
          className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
 
      {/* Content Panels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border animate-pulse space-y-4">
              <div className="h-5 bg-border rounded w-1/3" />
              <div className="h-4 bg-border rounded w-2/3" />
              <div className="h-4 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : activeTab === 'customers' ? (
        customers.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No customers registered</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Register First Customer
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-4 px-6">Customer Code</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Contact details</th>
                  <th className="py-4 px-6">GSTIN</th>
                  <th className="py-4 px-6 text-right">Outstanding</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.customerCode.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground">{c.customerCode}</td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-foreground">{c.name}</div>
                      {c.tradeName && <div className="text-[10px] text-muted-foreground">{c.tradeName}</div>}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        c.customerType === 'REGISTERED' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {c.customerType}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs space-y-0.5">
                      {c.email && <div className="text-foreground">{c.email}</div>}
                      {c.mobile && <div className="text-muted-foreground">{c.mobile}</div>}
                    </td>
                    <td className="py-4 px-6 text-xs text-foreground font-mono">{c.gstin || '-'}</td>
                    <td className="py-4 px-6 text-right font-bold text-foreground">
                      {formatCurrency(Number(c.outstandingAmount || 0))}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      <button onClick={() => handleOpenDetailModal(c)} className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg cursor-pointer inline-flex" title="View 360 & Ledger">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleOpenEditModal(c)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer inline-flex">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer inline-flex">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'leads' ? (
        leads.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No leads in pipeline</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Create Lead
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map((lead) => (
              <div key={lead.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{lead.name}</h3>
                      <p className="text-xs text-muted-foreground">{lead.companyName || 'Standalone Prospect'}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      lead.status === 'LOST' ? 'bg-red-500/10 text-red-500' : 'bg-accent/15 text-accent'
                    }`}>
                      {lead.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    {lead.value && <p>Estimated Weight: <span className="font-bold text-foreground">{formatCurrency(lead.value)}</span></p>}
                    {lead.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {lead.email}</p>}
                    {lead.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {lead.phone}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleOpenEditModal(lead)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(lead.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'contacts' ? (
        contacts.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No business contacts</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Create Contact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())).map((contact) => (
              <div key={contact.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
                      {contact.firstName[0]}{(contact.lastName || '')[0] || ''}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">{contact.firstName} {contact.lastName}</h3>
                      <p className="text-xs text-muted-foreground">{contact.designation || 'Contact Representative'}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    {contact.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {contact.email}</p>}
                    {contact.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {contact.phone}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleOpenEditModal(contact)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(contact.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        activities.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No CRM activities scheduled</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Schedule Task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.filter(a => a.subject.toLowerCase().includes(searchQuery.toLowerCase())).map((act) => (
              <div key={act.id} className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between ${
                act.isCompleted ? 'border-border bg-surface bg-opacity-30' : 'border-border'
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-bold text-base ${act.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {act.subject}
                      </h3>
                      <span className="inline-block mt-1 bg-accent/10 text-accent text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        {act.type}
                      </span>
                    </div>
                    <button 
                      onClick={() => toggleActivityCompletion(act)}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        act.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-border hover:border-green-500'
                      }`}
                    >
                      {act.isCompleted && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{act.description || 'No details provided.'}</p>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    {act.dueDate && <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-accent" /> Due Date: {act.dueDate.split('T')[0]}</p>}
                    {act.lead && <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-accent" /> Prospect: {act.lead.name}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleOpenEditModal(act)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(act.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* CRM Dynamic Overlay Dialog Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">
                {editingId ? 'Modify Details' : 'Add New Record'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            {/* Render conditional forms based on activeTab */}
            {activeTab === 'customers' && (
              <form onSubmit={customerForm.handleSubmit(handleCustomerSubmit)} className="p-6 space-y-4 text-left max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer Code *</label>
                    <input type="text" {...customerForm.register('customerCode')} placeholder="e.g. CUST-001" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" />
                    {customerForm.formState.errors.customerCode && <p className="text-xs text-red-500 mt-1">{customerForm.formState.errors.customerCode.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer Type</label>
                    <select {...customerForm.register('customerType')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                      <option value="UNREGISTERED">Unregistered / Consumer</option>
                      <option value="REGISTERED">Regular / Registered</option>
                      <option value="COMPOSITION">Composition Dealer</option>
                      <option value="SEZ">SEZ (Special Economic Zone)</option>
                      <option value="EXPORT">Overseas / Export</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer Name *</label>
                    <input type="text" {...customerForm.register('name')} placeholder="e.g. Acme Corporation" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    {customerForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{customerForm.formState.errors.name.message}</p>}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Trade / Business Name</label>
                    <input type="text" {...customerForm.register('tradeName')} placeholder="e.g. Acme Corp" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                    <input type="text" {...customerForm.register('email')} placeholder="billing@acme.com" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    {customerForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{customerForm.formState.errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mobile Number</label>
                    <input type="text" {...customerForm.register('mobile')} placeholder="+91 99999 99999" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Whatsapp</label>
                    <input type="text" {...customerForm.register('whatsapp')} placeholder="+91 99999 99999" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">GSTIN</label>
                    <input type="text" {...customerForm.register('gstin')} placeholder="e.g. 27AAAAA1111A1Z1" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">PAN Number</label>
                    <input type="text" {...customerForm.register('panNumber')} placeholder="e.g. ABCDE1234F" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Place of Supply</label>
                    <input type="text" {...customerForm.register('placeOfSupply')} placeholder="e.g. Maharashtra" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">State Code</label>
                    <input type="text" {...customerForm.register('stateCode')} placeholder="e.g. 27" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pin Code</label>
                    <input type="text" {...customerForm.register('pinCode')} placeholder="e.g. 400001" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">State</label>
                    <input type="text" {...customerForm.register('state')} placeholder="e.g. Maharashtra" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Credit Limit</label>
                    <input type="number" {...customerForm.register('creditLimit', { valueAsNumber: true })} placeholder="e.g. 50000" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Billing Address</label>
                    <textarea {...customerForm.register('address')} placeholder="Enter complete billing details..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Customer
                  </button>
                </div>
              </form>
            )}

            {/* Render conditional forms based on activeTab */}
            {activeTab === 'leads' && (
              <form onSubmit={leadForm.handleSubmit(handleLeadSubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Prospect Name *</label>
                    <input type="text" {...leadForm.register('name')} placeholder="e.g. John Doe" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    {leadForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{leadForm.formState.errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Company</label>
                    <input type="text" {...leadForm.register('companyName')} placeholder="e.g. TechCorp Ltd" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
                    <select {...leadForm.register('status')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                      <option value="NEW">New Prospect</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                    <input type="text" {...leadForm.register('email')} placeholder="john@techcorp.com" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    {leadForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{leadForm.formState.errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                    <input type="text" {...leadForm.register('phone')} placeholder="+91 99999 99999" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estimated Weight (Value) *</label>
                    <input type="number" {...leadForm.register('value', { valueAsNumber: true })} placeholder="150000" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pipeline Source</label>
                    <select {...leadForm.register('source')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                      <option value="WEBSITE">Website Form</option>
                      <option value="REFERRAL">Referral</option>
                      <option value="COLD_CALL">Cold outreach</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes / Details</label>
                    <textarea {...leadForm.register('notes')} placeholder="Provide brief summary of interest or discussions..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Prospect
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'contacts' && (
              <form onSubmit={contactForm.handleSubmit(handleContactSubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">First Name *</label>
                    <input type="text" {...contactForm.register('firstName')} placeholder="John" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last Name *</label>
                    <input type="text" {...contactForm.register('lastName')} placeholder="Doe" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Designation / Role</label>
                    <input type="text" {...contactForm.register('designation')} placeholder="e.g. Purchase Manager" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                    <input type="text" {...contactForm.register('email')} placeholder="john.doe@company.com" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    {contactForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{contactForm.formState.errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                    <input type="text" {...contactForm.register('phone')} placeholder="+91 99999 99999" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Contact
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'activities' && (
              <form onSubmit={activityForm.handleSubmit(handleActivitySubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Activity Type *</label>
                    <select {...activityForm.register('type')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                      <option value="CALL">Phone Call</option>
                      <option value="EMAIL">Email Follow-up</option>
                      <option value="MEETING">Meeting</option>
                      <option value="TASK">Task TODO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Due Date *</label>
                    <input type="date" {...activityForm.register('dueDate')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subject *</label>
                    <input type="text" {...activityForm.register('subject')} placeholder="e.g. Call client about invoice #123" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    {activityForm.formState.errors.subject && <p className="text-xs text-red-500 mt-1">{activityForm.formState.errors.subject.message}</p>}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea {...activityForm.register('description')} placeholder="Provide activity notes or next steps..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Task
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        customer={selectedCustomer}
      />
    </div>
      <DeleteDialog isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={confirmDelete} entityName="Item" entityId={itemToDelete?.name || itemToDelete?.id} warningText="This action cannot be undone." />
    </>
  );
};
