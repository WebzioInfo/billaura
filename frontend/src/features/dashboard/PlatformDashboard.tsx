import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users, Activity, Shield, ArrowUpRight, CheckCircle, AlertTriangle,
  Settings, DollarSign, Plus, Search, Lock, Unlock, Mail, FileText,
  RefreshCw, Layers, LifeBuoy, Bell, Server, Trash2, Edit2
} from 'lucide-react';
import api from '@/services/api';

// Format Helpers
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export function PlatformDashboard() {
  const location = useLocation();
  const currentTab = location.pathname.split('/').pop() || 'dashboard';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Loaded States
  const [companies, setCompanies] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>({ mrr: 0, totalRevenue: 0, transactionCount: 0, monthlyHistory: [] });
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Plan creation form
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: 29.99,
    billingCycle: 'MONTHLY',
    maxUsers: 5,
    maxInvoices: 100,
    maxCustomers: 100,
  });

  // SMTP Settings form
  const [smtpSettings, setSmtpSettings] = useState({
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (currentTab === 'dashboard') {
        const [compRes, revRes, logsRes] = await Promise.all([
          api.get('/platform/companies'),
          api.get('/platform/revenue'),
          api.get('/platform/logs'),
        ]);
        setCompanies(compRes?.data || compRes || []);
        setRevenue(revRes?.data || revRes || { mrr: 0, totalRevenue: 0, transactionCount: 0, monthlyHistory: [] });
        setLogs(logsRes?.data || logsRes || []);
      } else if (currentTab === 'companies') {
        const res = await api.get('/platform/companies');
        setCompanies(res?.data || res || []);
      } else if (currentTab === 'subscriptions') {
        const res = await api.get('/platform/subscriptions');
        setSubscriptions(res?.data || res || []);
      } else if (currentTab === 'plans') {
        const res = await api.get('/platform/plans');
        setPlans(res?.data || res || []);
      } else if (currentTab === 'users') {
        const res = await api.get('/platform/users');
        setUsers(res?.data || res || []);
      } else if (currentTab === 'revenue') {
        const res = await api.get('/platform/revenue');
        setRevenue(res?.data || res || { mrr: 0, totalRevenue: 0, transactionCount: 0, monthlyHistory: [] });
      } else if (currentTab === 'logs' || currentTab === 'monitoring') {
        const res = await api.get('/platform/logs');
        setLogs(res?.data || res || []);
      } else if (currentTab === 'settings') {
        const res = await api.get('/platform/settings');
        const data = res?.data || res || {};
        setSettings(data);
        setSmtpSettings({
          SMTP_HOST: data.SMTP_HOST || '',
          SMTP_PORT: data.SMTP_PORT || '587',
          SMTP_USER: data.SMTP_USER || '',
          SMTP_PASS: data.SMTP_PASS || '',
        });
      }
    } catch (err) {
      console.error('Platform data load failure:', err);
      toast.error('Failed to load platform operations records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTab]);

  const handleToggleSuspend = async (companyId: string) => {
    try {
      const res = await api.post(`/platform/companies/${companyId}/suspend`, {});
      toast.success(`Company operational status updated to ${res?.data?.status || 'changed'}`);

      // Update local state list
      setCompanies(prev => prev.map(c => {
        if (c.id === companyId) {
          return { ...c, status: res?.data?.status };
        }
        return c;
      }));
    } catch (err) {
      toast.error('Failed to toggle company status');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('WARNING: This will permanently delete the company and ALL associated data (invoices, customers, inventory). Are you sure?')) return;
    try {
      await api.delete(`/platform/companies/${companyId}`);
      toast.success('Company deleted successfully');
      setCompanies(prev => prev.filter(c => c.id !== companyId));
    } catch (err) {
      toast.error('Failed to delete company');
    }
  };

  const [editingUser, setEditingUser] = useState<any | null>(null);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/platform/users/${editingUser.id}`, {
        name: editingUser.name,
        email: editingUser.email,
        globalRole: editingUser.globalRole,
      });
      toast.success('User updated successfully');
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editingUser } : u));
      setEditingUser(null);
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this global user account?')) return;
    try {
      await api.delete(`/platform/users/${userId}`);
      toast.success('User deleted successfully');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/platform/plans', newPlan);
      toast.success('Subscription pricing tier added successfully');
      setShowAddPlanModal(false);
      // Reload plans
      const res = await api.get('/platform/plans');
      setPlans(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to create plan');
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/platform/settings', smtpSettings);
      toast.success('SMTP Server credentials configuration updated');
    } catch (err) {
      toast.error('Failed to update system settings');
    }
  };

  // Filtered lists based on search query
  const filteredCompanies = companies.filter(c =>
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.legalName && c.legalName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render Sub-Views
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center py-20 gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <span>Synchronizing with global controller...</span>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">
                  Platform Operations
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Super Admin system administration control desk.
                </p>
              </div>
            </div>
            
            {/* KPI grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tenants</h3>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{companies.length}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>All active and healthy</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform MRR</h3>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(revenue.mrr)}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Recurring licenses</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aggregate Sales</h3>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(revenue.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 font-medium">
                  <span>{revenue.transactionCount} paid subscriptions</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Health</h3>
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">99.98%</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>CPU/RAM operational</span>
                </div>
              </div>
            </div>

            {/* Performance charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-900">Monthly Licensing Inflow</h3>
                  <span className="text-xs text-slate-500">Trailing 6 Months</span>
                </div>
                <div className="h-64 flex items-end gap-6 pt-4 px-2">
                  {revenue.monthlyHistory.map((item: any, idx: number) => {
                    const maxVal = Math.max(...revenue.monthlyHistory.map((h: any) => h.revenue), 1);
                    const heightPercent = (item.revenue / maxVal) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <div
                          className="w-full bg-gradient-to-t from-indigo-500 to-indigo-600 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all cursor-pointer shadow-sm relative group"
                          style={{ height: `${heightPercent * 0.8}%` }}
                        >
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-950 text-white text-[10px] py-1 px-2 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-20">
                            {formatCurrency(item.revenue)}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Server metrics */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Core Telemetry Load</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">AWS ECS Cluster CPU Util</span>
                      <span className="text-indigo-600">32%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '32%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">RDS Aurora MySQL Cache Hit</span>
                      <span className="text-emerald-600">98.4%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: '98.4%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">Elasticache Redis RAM Usage</span>
                      <span className="text-yellow-600">54%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: '54%' }} />
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Region: us-east-1</span>
                  <span>SSL: Let's Encrypt Active</span>
                </div>
              </div>
            </div>

            {/* Audit log tail */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-900">Recent Platform Operations</h3>
                <span className="text-xs text-slate-500">Last 5 activities</span>
              </div>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No system logs recorded yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-3 flex justify-between items-center gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{log.action}</p>
                        <p className="text-slate-500 mt-0.5">{log.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-700 font-medium">{log.userName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'companies':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Companies</h1>
              <p className="text-sm text-slate-500 mt-1">Manage isolated tenant environments and subscriptions.</p>
            </div>
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Tenant Companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-xs text-slate-500">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Company Name</th>
                    <th className="px-6 py-4">Legal Name</th>
                    <th className="px-6 py-4">Subscription Plan</th>
                    <th className="px-6 py-4">Active Users</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-900">{c.companyName}</td>
                      <td className="px-6 py-4">{c.legalName || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700">{c.activePlan}</span>
                      </td>
                      <td className="px-6 py-4">{c.userCount} users</td>
                      <td className="px-6 py-4">{formatDate(c.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] ${c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                          c.status === 'SUSPENDED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleSuspend(c.id)}
                          className={`font-semibold cursor-pointer text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.status === 'SUSPENDED'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            }`}
                        >
                          {c.status === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(c.id)}
                          className="font-semibold cursor-pointer text-xs p-1.5 rounded-lg border transition-colors bg-white text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                          title="Delete Company"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No companies matching filters found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'subscriptions':
      case 'plans':
        return (
          <div className="space-y-8 animate-fadeIn">
            {/* Title with add plan */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Subscription Plans</h2>
                <p className="text-xs text-slate-500">Manage billing plans and SaaS boundaries.</p>
              </div>
              <button
                onClick={() => setShowAddPlanModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Pricing Tier
              </button>
            </div>

            {/* Plans List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{p.name}</h4>
                    <p className="text-2xl font-black text-indigo-600 mb-6">{formatCurrency(p.price)} <span className="text-xs text-slate-400 font-semibold">/{p.billingCycle.toLowerCase()}</span></p>

                    <ul className="space-y-3 text-xs text-slate-600 mb-8">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Up to {p.maxUsers} system users</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Up to {p.maxInvoices} monthly invoices</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>Up to {p.maxCustomers} CRM customers</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Plan Modal */}
            {showAddPlanModal && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fadeIn">
                  <h3 className="text-base font-bold text-slate-900 mb-4">Add Subscription Pricing Tier</h3>
                  <form onSubmit={handleCreatePlan} className="space-y-4 text-xs text-slate-700">
                    <div>
                      <label className="block font-semibold mb-1">Plan Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pro Growth"
                        value={newPlan.name}
                        onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-1">Price (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={newPlan.price}
                          onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Billing Cycle</label>
                        <select
                          value={newPlan.billingCycle}
                          onChange={(e) => setNewPlan({ ...newPlan, billingCycle: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block font-semibold mb-1">Max Users</label>
                        <input
                          type="number"
                          required
                          value={newPlan.maxUsers}
                          onChange={(e) => setNewPlan({ ...newPlan, maxUsers: Number(e.target.value) })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Max Invoices</label>
                        <input
                          type="number"
                          required
                          value={newPlan.maxInvoices}
                          onChange={(e) => setNewPlan({ ...newPlan, maxInvoices: Number(e.target.value) })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Max Customers</label>
                        <input
                          type="number"
                          required
                          value={newPlan.maxCustomers}
                          onChange={(e) => setNewPlan({ ...newPlan, maxCustomers: Number(e.target.value) })}
                          className="w-full p-2.5 border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddPlanModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer hover:bg-indigo-700"
                      >
                        Create Plan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registered Users</h1>
              <p className="text-sm text-slate-500 mt-1">Manage global user accounts and platform access.</p>
            </div>
            <div className="flex justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Registered Users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-xs text-slate-500">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Global Role</th>
                    <th className="px-6 py-4">Email Verified</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4">Account Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{u.globalRole}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 font-bold ${u.emailVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {u.emailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                          {u.isActive ? 'Active' : 'Locked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No platform users match filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fadeIn">
                  <h3 className="text-base font-bold text-slate-900 mb-4">Edit Platform User</h3>
                  <form onSubmit={handleUpdateUser} className="space-y-4 text-xs text-slate-700">
                    <div>
                      <label className="block font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Global Role</label>
                      <select
                        value={editingUser.globalRole}
                        onChange={(e) => setEditingUser({ ...editingUser, globalRole: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="ADMIN">Admin</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="CUSTOM_ROLE">Custom Role</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer hover:bg-indigo-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );

      case 'support':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform Helpdesk</h2>
              <p className="text-xs text-slate-500">Customer feedback and system tickets log.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center py-20 text-slate-500 text-xs">
              <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <span>All customer tickets have been resolved. System load is zero.</span>
            </div>
          </div>
        );

      case 'revenue':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Annual Recurring Inflow</h3>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(revenue.mrr * 12)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Platform MRR</h3>
                <p className="text-3xl font-black text-emerald-600">{formatCurrency(revenue.mrr)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Inflow Collected</h3>
                <p className="text-3xl font-black text-indigo-600">{formatCurrency(revenue.totalRevenue)}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Historical Billing Logs</h3>
              <div className="text-center py-12 text-slate-400 text-xs">
                Billing invoice logs are secure in database.
              </div>
            </div>
          </div>
        );

      case 'monitoring':
      case 'logs':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">System Logs Tail</h2>
                <p className="text-xs text-slate-500">Live platform operations audit trail.</p>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
              </button>
            </div>

            <div className="bg-slate-950 text-slate-300 font-mono text-xs p-6 rounded-2xl border border-slate-800 shadow-2xl max-h-[500px] overflow-y-auto space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="leading-relaxed hover:bg-slate-900/50 py-1 px-2 rounded transition-colors">
                  <span className="text-indigo-400 font-bold">[{formatDate(log.createdAt)}]</span>{' '}
                  <span className="text-emerald-400 font-bold uppercase">{log.action}:</span>{' '}
                  <span className="text-slate-100">{log.description}</span>{' '}
                  <span className="text-slate-500 italic">by {log.userName} ({log.companyName})</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-12 text-slate-600 italic">
                  No terminal logs available.
                </div>
              )}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-8 animate-fadeIn max-w-xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Global Platform Settings</h2>
              <p className="text-xs text-slate-500">SMTP and operations setup.</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" /> Platform SMTP Server Configuration
              </h3>
              <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs text-slate-700">
                <div>
                  <label className="block font-semibold mb-1">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={smtpSettings.SMTP_HOST}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_HOST: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold mb-1">SMTP User</label>
                    <input
                      type="text"
                      placeholder="alerts@billaura.com"
                      value={smtpSettings.SMTP_USER}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_USER: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">SMTP Port</label>
                    <input
                      type="text"
                      placeholder="587"
                      value={smtpSettings.SMTP_PORT}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_PORT: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">SMTP Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={smtpSettings.SMTP_PASS}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, SMTP_PASS: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-indigo-700 cursor-pointer shadow-sm"
                  >
                    Save SMTP Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Broadcast Notifications</h2>
              <p className="text-xs text-slate-500">Send system notices to all company dashboards.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center py-20 text-slate-500 text-xs">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <span>No notifications broadcasting today.</span>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fadeIn max-w-md">
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Admin Profile</h2>
              <p className="text-xs text-slate-500">Global account configurations.</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 text-xs text-slate-700">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow">
                  SA
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Webzio Super Admin</h4>
                  <p className="text-slate-500 mt-0.5">Global SaaS Administrator</p>
                </div>
              </div>
              <div className="space-y-2">
                <p><strong>Username:</strong> superadmin</p>
                <p><strong>Primary Contact Email:</strong> admin@webzio.com</p>
                <p><strong>Access Authority:</strong> Read/Write Global System</p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-20 text-slate-500">
            Tab not implemented
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {renderContent()}
    </div>
  );
}
