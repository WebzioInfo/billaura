import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Search, Plus, Edit2, Trash2, CheckCircle2, 
  Phone, Mail, Calendar, Loader2, AlertCircle, TrendingUp, Check, Briefcase 
} from 'lucide-react';
import api from '../../services/api';

// --- SCHEMAS ---
const leadSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.string().length(0)),
  phone: z.string().optional(),
  status: z.string(),
  source: z.string().optional(),
  value: z.number(),
  notes: z.string().optional(),
});

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().or(z.string().length(0)),
  phone: z.string().optional(),
  designation: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
});

const activitySchema = z.object({
  type: z.string().min(1, 'Activity type is required'),
  subject: z.string().min(2, 'Subject is required'),
  description: z.string().optional(),
  dueDate: z.string().nonempty('Due date is required'),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;
type ContactFormValues = z.infer<typeof contactSchema>;
type ActivityFormValues = z.infer<typeof activitySchema>;

// --- TYPES ---
interface Lead {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  value: number;
  notes?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  customerId?: string;
  vendorId?: string;
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
  const [activeTab, setActiveTab] = useState<'leads' | 'contacts' | 'activities'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lists states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Forms hooks
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'leads') {
        const res = await api.get<{ success: boolean; data: { items: Lead[] } }>('/crm/leads');
        setLeads(res.data?.items || []);
      } else if (activeTab === 'contacts') {
        const res = await api.get<{ success: boolean; data: { items: Contact[] } }>('/crm/contacts');
        setContacts(res.data?.items || []);
      } else {
        const res = await api.get<{ success: boolean; data: { items: Activity[] } }>('/crm/activities');
        setActivities(res.data?.items || []);
      }
    } catch (err) {
      toast.error('Failed to load CRM data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    leadForm.reset();
    contactForm.reset();
    activityForm.reset();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'leads') {
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
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const endpoint = activeTab === 'leads' ? '/crm/leads' : activeTab === 'contacts' ? '/crm/contacts' : '/crm/activities';
      await api.delete(`${endpoint}/${id}`);
      toast.success('Item deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const toggleActivityCompletion = async (act: Activity) => {
    try {
      await api.patch(`/crm/activities/${act.id}`, { isCompleted: !act.isCompleted });
      toast.success(act.isCompleted ? 'Task marked incomplete' : 'Task completed successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to update activity status');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Pipeline total value calculation
  const totalPipelineValue = leads
    .filter(l => l.status === 'NEW' || l.status === 'CONTACTED' || l.status === 'QUALIFIED')
    .reduce((sum, l) => sum + Number(l.value || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            CRM Pipeline & Contacts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage prospective leads, track customer follow-up actions, and view the pipeline health.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'leads' ? 'Add Prospect Lead' : activeTab === 'contacts' ? 'Add Contact' : 'Schedule Activity'}
        </button>
      </div>

      {/* KPI Cards Row (If Leads is active) */}
      {activeTab === 'leads' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Pipeline Weight</span>
              <h3 className="text-2xl font-black text-foreground">{formatCurrency(totalPipelineValue)}</h3>
            </div>
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-border flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Active Leads</span>
              <h3 className="text-2xl font-black text-foreground">{leads.filter(l => l.status !== 'LOST').length}</h3>
            </div>
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex border-b border-border">
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
                      {contact.firstName[0]}{contact.lastName[0]}
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
    </div>
  );
};
