import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiClient as api } from '../../../core/api/apiClient';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import {
  Building2, Briefcase, Clock, FileText, CheckCircle2, XCircle,
  Plus, Edit, Trash2, Calendar, DollarSign, Search, Filter,
  Settings, Loader2, ArrowLeftRight, RotateCcw, AlertTriangle
} from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect';

type MasterTab = 'departments' | 'designations' | 'cost-centres' | 'employment-types' | 'leave-types' | 'salary-components' | 'shifts' | 'holidays';

export const HRMastersManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const subParam = searchParams.get('sub');
  const [activeTab, setActiveTab] = useState<MasterTab>(
    (subParam as MasterTab) || 'departments'
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({});

  // Dependency modal state
  const [dependencyInfo, setDependencyInfo] = useState<{
    isOpen: boolean;
    itemName: string;
    itemId: string;
    details: { employees: number; expenses: number; departments: number; count: number; message: string };
  } | null>(null);

  // Sync tab with URL search parameter
  useEffect(() => {
    if (subParam && subParam !== activeTab) {
      setActiveTab(subParam as MasterTab);
    }
  }, [subParam]);

  const handleTabChange = (tab: MasterTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSearchParams({ tab: 'masters', sub: tab });
  };

  // Helper to determine endpoints
  const getEndpoint = (tab: MasterTab) => {
    if (tab === 'cost-centres') return '/cost-centers';
    return `/hr-masters/${tab}`;
  };

  // Fetch Master Data
  const { data: masters = [], isLoading } = useQuery({
    queryKey: ['hr-masters', activeTab, includeArchived],
    queryFn: async () => {
      const endpoint = getEndpoint(activeTab);
      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}includeDeleted=${includeArchived}`;
      const res = await api.get<any>(url);
      
      if (activeTab === 'cost-centres') {
        const items = res.data?.items || res.items || res.data || res || [];
        return Array.isArray(items) ? items : [];
      }
      return Array.isArray(res) ? res : (res?.data || []);
    }
  });

  // Fetch all helper data for dropdowns
  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers-dropdown'],
    queryFn: async () => {
      const res = await api.get<any>('/cost-centers');
      const items = res.data?.items || res.items || res.data || res || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: async () => {
      const res = await api.get<any>('/hr/employees');
      return Array.isArray(res) ? res : (res?.data || []);
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-dropdown'],
    queryFn: async () => {
      const res = await api.get<any>('/hr-masters/departments');
      return Array.isArray(res) ? res : (res?.data || []);
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const endpoint = getEndpoint(activeTab);
      return api.post(endpoint, data);
    },
    onSuccess: () => {
      notification.success('Item created successfully');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['hr-masters', activeTab] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Creation failed');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      const endpoint = getEndpoint(activeTab);
      
      // Strip system fields injected by setFormData({...item})
      const { 
        id: _id, companyId, createdAt, updatedAt, deletedAt, 
        createdById, updatedById, department, manager, costCenter, 
        ...payload 
      } = data;
      
      if (activeTab === 'cost-centres') {
        return api.patch(`${endpoint}/${id}`, payload);
      }
      return api.put(`${endpoint}/${id}`, payload);
    },
    onSuccess: () => {
      notification.success('Item updated successfully');
      setIsModalOpen(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['hr-masters', activeTab] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Update failed');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const endpoint = getEndpoint(activeTab);
      return api.delete(`${endpoint}/${id}`);
    },
    onSuccess: () => {
      notification.success('Item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['hr-masters', activeTab] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Deletion failed');
    }
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    if (activeTab === 'departments') {
      setFormData({ code: '', name: '', description: '', costCenterId: '', managerId: '', isActive: true });
    } else if (activeTab === 'designations') {
      setFormData({ code: '', name: '', departmentId: '', level: 'L1', description: '', isActive: true });
    } else if (activeTab === 'cost-centres') {
      setFormData({ code: '', name: '', managerId: '', monthlyBudget: 0, annualBudget: 0, description: '', isActive: true });
    } else if (activeTab === 'shifts') {
      setFormData({ name: '', startTime: '09:00', endTime: '17:00', graceTime: 15, isActive: true });
    } else if (activeTab === 'employment-types') {
      setFormData({ code: '', name: '', description: '', isActive: true });
    } else if (activeTab === 'leave-types') {
      setFormData({ code: '', name: '', description: '', isActive: true });
    } else if (activeTab === 'salary-components') {
      setFormData({ code: '', name: '', type: 'EARNING', description: '', isActive: true });
    } else if (activeTab === 'holidays') {
      setFormData({ name: '', date: new Date().toISOString().split('T')[0], isRecurring: false, description: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'holidays' && item.date) {
      setFormData({ ...item, date: item.date.split('T')[0] });
    } else if (activeTab === 'cost-centres') {
      setFormData({
        ...item,
        monthlyBudget: Number(item.monthlyBudget || 0),
        annualBudget: Number(item.annualBudget || 0),
      });
    } else {
      setFormData({ ...item });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate name or code validation locally
    const codeConflict = masters.some((m: any) => 
      m.id !== editingItem?.id && 
      m.code && 
      formData.code && 
      m.code.toLowerCase() === formData.code.toLowerCase() &&
      !m.deletedAt
    );
    const nameConflict = masters.some((m: any) => 
      m.id !== editingItem?.id && 
      m.name.toLowerCase() === formData.name.toLowerCase() &&
      !m.deletedAt
    );
    
    if (codeConflict) {
      notification.error('A master record with this code already exists.');
      return;
    }
    if (nameConflict) {
      notification.error('A master record with this name already exists.');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteClick = async (item: any) => {
    try {
      const isCC = activeTab === 'cost-centres';
      const depUrl = isCC 
        ? `/cost-centers/${item.id}/dependencies`
        : `/hr-masters/${activeTab}/${item.id}/dependencies`;
        
      const res = await api.get<any>(depUrl);
      const deps = res.data || res;
      
      const hasDeps = deps.hasDependencies || deps.count > 0;
      if (hasDeps) {
        setDependencyInfo({
          isOpen: true,
          itemName: item.name,
          itemId: item.id,
          details: {
            employees: deps.employees || deps.count || 0,
            expenses: deps.expenses || 0,
            departments: deps.departments || 0,
            count: deps.count || 0,
            message: deps.message || `This master record is currently linked to other transactions.`
          }
        });
      } else {
        const confirmed = await dialog.confirmDelete(
          'Delete Master?',
          `Are you sure you want to delete "${item.name}"?`
        );
        if (confirmed) {
          deleteMutation.mutate(item.id);
        }
      }
    } catch (err) {
      const confirmed = await dialog.confirmDelete(
        'Delete Master?',
        `Are you sure you want to delete "${item.name}"?`
      );
      if (confirmed) {
        deleteMutation.mutate(item.id);
      }
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const isCC = activeTab === 'cost-centres';
      if (isCC) {
        await api.post(`/cost-centers/${id}/archive`);
      } else {
        await api.delete(`/hr-masters/${activeTab}/${id}`);
      }
      notification.success('Item archived successfully');
      setDependencyInfo(null);
      queryClient.invalidateQueries({ queryKey: ['hr-masters', activeTab] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Archiving failed');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const isCC = activeTab === 'cost-centres';
      const url = isCC 
        ? `/cost-centers/${id}/restore`
        : `/hr-masters/${activeTab}/${id}/restore`;
      await api.post(url);
      notification.success('Item restored successfully');
      queryClient.invalidateQueries({ queryKey: ['hr-masters', activeTab] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Restoration failed');
    }
  };

  const filteredMasters = masters.filter((item: any) => {
    const term = searchQuery.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.code && item.code.toLowerCase().includes(term)) ||
      (item.description && item.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-1 text-left">
      {/* Sidebar Navigation */}
      <Card className="lg:col-span-1 p-4 bg-surface border border-border flex flex-col space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          HRMS Master Configs
        </div>
        {[
          { tab: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" /> },
          { tab: 'designations', label: 'Designations', icon: <Briefcase className="w-4 h-4" /> },
          { tab: 'cost-centres', label: 'Cost Centres', icon: <ArrowLeftRight className="w-4 h-4" /> },
          { tab: 'shifts', label: 'Shifts', icon: <Clock className="w-4 h-4" /> },
          { tab: 'employment-types', label: 'Employment Types', icon: <FileText className="w-4 h-4" /> },
          { tab: 'leave-types', label: 'Leave Types', icon: <Calendar className="w-4 h-4" /> },
          { tab: 'salary-components', label: 'Salary Components', icon: <DollarSign className="w-4 h-4" /> },
          { tab: 'holidays', label: 'Holidays Calendar', icon: <Calendar className="w-4 h-4" /> },
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => handleTabChange(item.tab as MasterTab)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === item.tab
                ? 'bg-accent/15 text-accent border-l-4 border-accent'
                : 'text-muted-foreground hover:bg-muted/15 hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </Card>

      {/* Main Content Area */}
      <Card className="lg:col-span-3 p-6 bg-surface border border-border space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {activeTab !== 'shifts' && (
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeArchived} 
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  className="rounded border-border bg-background focus:ring-accent"
                />
                Show Archived
              </label>
            )}
          </div>

          <Button
            onClick={handleOpenCreate}
            variant="primary"
            className="flex items-center gap-2 font-bold px-4 py-2"
          >
            <Plus className="w-4 h-4" /> Add Master
          </Button>
        </div>

        {/* Loading / Table View */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredMasters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No records found. Click "Add Master" to create your first config.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {activeTab !== 'shifts' && activeTab !== 'holidays' && <th className="py-3 px-4">Code</th>}
                  <th className="py-3 px-4">Name</th>
                  {activeTab === 'departments' && <th className="py-3 px-4">Manager</th>}
                  {activeTab === 'departments' && <th className="py-3 px-4">Cost Center</th>}
                  {activeTab === 'designations' && <th className="py-3 px-4">Level</th>}
                  {activeTab === 'cost-centres' && <th className="py-3 px-4">Manager</th>}
                  {activeTab === 'cost-centres' && <th className="py-3 px-4">Budget (Mo/Yr)</th>}
                  {activeTab === 'shifts' && (
                    <>
                      <th className="py-3 px-4">Start Time</th>
                      <th className="py-3 px-4">End Time</th>
                    </>
                  )}
                  {activeTab === 'holidays' && <th className="py-3 px-4">Date</th>}
                  {activeTab === 'salary-components' && <th className="py-3 px-4">Type</th>}
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMasters.map((item: any) => (
                  <tr key={item.id} className={`border-b border-border/50 hover:bg-background/20 transition-colors ${item.deletedAt ? 'opacity-60 bg-muted/5' : ''}`}>
                    {activeTab !== 'shifts' && activeTab !== 'holidays' && (
                      <td className="py-3.5 px-4 font-bold text-foreground">{item.code || '-'}</td>
                    )}
                    <td className="py-3.5 px-4 text-sm font-semibold text-foreground">
                      {item.name}
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground font-normal mt-0.5">{item.description}</p>
                      )}
                    </td>
                    {activeTab === 'departments' && (
                      <td className="py-3.5 px-4 text-sm text-foreground">{item.manager?.name || 'Unassigned'}</td>
                    )}
                    {activeTab === 'departments' && (
                      <td className="py-3.5 px-4 text-sm text-foreground">{item.costCenter?.name || 'Unassigned'}</td>
                    )}
                    {activeTab === 'designations' && (
                      <td className="py-3.5 px-4 text-sm text-foreground">{item.level}</td>
                    )}
                    {activeTab === 'cost-centres' && (
                      <td className="py-3.5 px-4 text-sm text-foreground">{item.manager?.name || 'Unassigned'}</td>
                    )}
                    {activeTab === 'cost-centres' && (
                      <td className="py-3.5 px-4 text-xs font-mono text-foreground">
                        Mo: ₹{Number(item.monthlyBudget || 0).toLocaleString()}<br />
                        Yr: ₹{Number(item.annualBudget || 0).toLocaleString()}
                      </td>
                    )}
                    {activeTab === 'shifts' && (
                      <>
                        <td className="py-3.5 px-4 text-sm text-foreground">{item.startTime}</td>
                        <td className="py-3.5 px-4 text-sm text-foreground">{item.endTime}</td>
                      </>
                    )}
                    {activeTab === 'holidays' && (
                      <td className="py-3.5 px-4 text-sm text-foreground">{item.date?.split('T')[0]}</td>
                    )}
                    {activeTab === 'salary-components' && (
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${item.type === 'EARNING' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                          {item.type}
                        </span>
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-semibold text-xs">
                      {item.deletedAt ? (
                        <span className="text-amber-500">Archived</span>
                      ) : (item.isActive ?? true) ? (
                        <span className="text-green-500">Active</span>
                      ) : (
                        <span className="text-red-500">Inactive</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {item.deletedAt ? (
                          <button
                            onClick={() => handleRestore(item.id)}
                            title="Restore"
                            className="p-1.5 hover:bg-green-500/10 rounded-lg text-green-600 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden text-left">
            <div className="px-6 py-4 border-b border-border bg-background bg-opacity-35 flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground">
                {editingItem ? 'Edit Master Config' : 'Create Master Config'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* DEPARTMENT FORM */}
              {activeTab === 'departments' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Department Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. ADM"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Department Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Administration"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  
                  <SearchableSelect
                    label="Department Head"
                    value={formData.managerId || ''}
                    onChange={(val) => setFormData({ ...formData, managerId: val })}
                    options={employees}
                    placeholder="Search Employee..."
                    mapOption={(emp) => ({
                      label: emp.name,
                      value: emp.id,
                      description: `Code: ${emp.employeeCode} | ${emp.designation?.name || 'No Title'}`
                    })}
                  />

                  <SearchableSelect
                    label="Cost Center"
                    value={formData.costCenterId || ''}
                    onChange={(val) => setFormData({ ...formData, costCenterId: val })}
                    options={costCenters}
                    placeholder="Search Cost Center..."
                    mapOption={(cc) => ({
                      label: `${cc.name} (${cc.code || 'N/A'})`,
                      value: cc.id,
                      description: cc.description || ''
                    })}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter department scope/details..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent h-20"
                    />
                  </div>
                </div>
              )}

              {/* DESIGNATION FORM */}
              {activeTab === 'designations' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Designation Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. GM"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Designation Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. General Manager"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <SearchableSelect
                    label="Department *"
                    required
                    value={formData.departmentId || ''}
                    onChange={(val) => setFormData({ ...formData, departmentId: val })}
                    options={departments}
                    placeholder="Search Department..."
                    mapOption={(dept) => ({
                      label: dept.name,
                      value: dept.id,
                      description: dept.code
                    })}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Level / Grade</label>
                    <input
                      type="text"
                      value={formData.level || 'L1'}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      placeholder="e.g. L3, Senior"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Define responsibilities..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent h-20"
                    />
                  </div>
                </div>
              )}

              {/* COST CENTRE FORM */}
              {activeTab === 'cost-centres' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cost Centre Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. FIN-CC"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cost Centre Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Finance & Accounting"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <SearchableSelect
                    label="Manager"
                    value={formData.managerId || ''}
                    onChange={(val) => setFormData({ ...formData, managerId: val })}
                    options={employees}
                    placeholder="Search Manager..."
                    mapOption={(emp) => ({
                      label: emp.name,
                      value: emp.id,
                      description: `Code: ${emp.employeeCode} | ${emp.designation?.name || 'No Title'}`
                    })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Monthly Budget (INR) *</label>
                      <input
                        type="number"
                        required
                        value={formData.monthlyBudget ?? 0}
                        onChange={(e) => setFormData({ ...formData, monthlyBudget: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Annual Budget (INR) *</label>
                      <input
                        type="number"
                        required
                        value={formData.annualBudget ?? 0}
                        onChange={(e) => setFormData({ ...formData, annualBudget: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Explain cost center allocation..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent h-20"
                    />
                  </div>
                </div>
              )}

              {/* SHIFT FORM */}
              {activeTab === 'shifts' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Shift Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Regular Morning"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Start Time *</label>
                      <input
                        type="text"
                        required
                        value={formData.startTime || '09:00'}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        placeholder="HH:MM"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">End Time *</label>
                      <input
                        type="text"
                        required
                        value={formData.endTime || '17:00'}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        placeholder="HH:MM"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Grace Time (mins)</label>
                      <input
                        type="number"
                        required
                        value={formData.graceTime ?? 15}
                        onChange={(e) => setFormData({ ...formData, graceTime: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* HOLIDAY FORM */}
              {activeTab === 'holidays' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Holiday Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Independence Day"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date || ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formData.isRecurring || false}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="rounded border-border bg-background focus:ring-accent"
                    />
                    <label htmlFor="isRecurring" className="text-sm text-foreground cursor-pointer select-none">Recurring Holiday (Annual)</label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Details of the holiday..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent h-20"
                    />
                  </div>
                </div>
              )}

              {/* SALARY COMPONENT FORM */}
              {activeTab === 'salary-components' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Component Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. HRA"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. House Rent Allowance"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Component Type *</label>
                    <select
                      value={formData.type || 'EARNING'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="EARNING">Earning</option>
                      <option value="DEDUCTION">Deduction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Salary calculation rules..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent h-20"
                    />
                  </div>
                </div>
              )}

              {/* GENERIC FORM FOR EMPLOYMENT & LEAVE TYPES */}
              {(activeTab === 'employment-types' || activeTab === 'leave-types') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. CAS"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Casual Leave"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter details..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent h-20"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-border bg-background focus:ring-accent"
                />
                <label htmlFor="isActive" className="text-sm text-foreground cursor-pointer select-none">Active / Enabled</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? 'Save Changes' : 'Create Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dependency / Soft Delete Modal */}
      {dependencyInfo?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-md p-6 space-y-4 text-left">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="font-bold text-lg text-foreground">Record In Use</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              The master configuration <strong>"{dependencyInfo.itemName}"</strong> cannot be hard-deleted because it is currently linked to:
            </p>

            <div className="bg-background/50 rounded-xl p-3 border border-border text-xs font-mono space-y-1">
              {activeTab === 'cost-centres' ? (
                <>
                  <div>• Linked Employees: {dependencyInfo.details.employees}</div>
                  <div>• Linked Expense Entries: {dependencyInfo.details.expenses}</div>
                  <div>• Linked Departments: {dependencyInfo.details.departments}</div>
                </>
              ) : (
                <div>• Linked Relations: {dependencyInfo.details.count || 1}</div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              To preserve database referential integrity, you should <strong>Archive</strong> this record. Archived records are deactivated and hidden but historical logs remain intact.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDependencyInfo(null)}>Cancel</Button>
              <Button 
                variant="primary" 
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => handleArchive(dependencyInfo.itemId)}
              >
                Archive Instead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
