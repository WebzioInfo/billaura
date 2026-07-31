import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { User, Briefcase, Building, Clock, DollarSign, Shield, FileText, Phone } from 'lucide-react';

interface EditEmployeeWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  initialData: any;
}

export const EditEmployeeWorkspace: React.FC<EditEmployeeWorkspaceProps> = ({ isOpen, onClose, employeeId, initialData }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        ...initialData,
        firstName: initialData.name ? initialData.name.split(' ')[0] : '',
        lastName: initialData.name ? initialData.name.split(' ').slice(1).join(' ') : '',
      });
    }
  }, [initialData, isOpen]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiClient.patch(`/hr/employees/${employeeId}`, values);
      return res.data;
    },
    onSuccess: () => {
      notification.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to update employee');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'department', label: 'Department & Branch', icon: Building },
    { id: 'shift', label: 'Shift & Time', icon: Clock },
    { id: 'salary', label: 'Salary Structure', icon: DollarSign },
    { id: 'bank', label: 'Bank Details', icon: Shield },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'emergency', label: 'Emergency Contacts', icon: Phone },
  ];

  return (
    <Modal title={`Edit Employee: ${initialData?.name || 'Unknown'}`} isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="flex h-[70vh]">
        {/* Sidebar */}
        <div className="w-1/4 border-r border-border pr-4 overflow-y-auto">
          <nav className="flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="w-3/4 pl-6 overflow-y-auto">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'personal' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-bold text-lg border-b border-border pb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <Input name="firstName" value={formData.firstName || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <Input name="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mobile</label>
                    <Input name="mobile" value={formData.mobile || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Gender</label>
                    <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth</label>
                    <Input type="date" name="dateOfBirth" value={formData.dateOfBirth?.split('T')[0] || ''} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employment' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="font-bold text-lg border-b border-border pb-2">Employment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Employee Code</label>
                    <Input name="employeeCode" value={formData.employeeCode || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Joining Date</label>
                    <Input type="date" name="joiningDate" value={formData.joiningDate?.split('T')[0] || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select name="isActive" value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {['department', 'shift', 'salary', 'bank', 'documents', 'emergency'].includes(activeTab) && (
              <div className="space-y-4 animate-in fade-in duration-300">
                 <h3 className="font-bold text-lg border-b border-border pb-2 capitalize">{activeTab} Details</h3>
                 <p className="text-sm text-muted-foreground">This section is available for extended fields mapping. (Fields can be dynamically added based on schema).</p>
              </div>
            )}

          </form>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" form="edit-employee-form" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};
