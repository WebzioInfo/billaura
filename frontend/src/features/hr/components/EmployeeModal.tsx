import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, initialData }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    departmentId: '',
    designationId: '',
    costCenterId: '',
    employmentTypeId: '',
    shiftId: '',
    branchId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    basicSalary: 0,
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (initialData && isOpen) {
      const names = initialData.name ? initialData.name.split(' ') : ['', ''];
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      setFormData({
        employeeCode: initialData.employeeCode || '',
        firstName,
        lastName,
        email: initialData.email || '',
        mobile: initialData.mobile || '',
        departmentId: initialData.departmentId || '',
        designationId: initialData.designationId || '',
        costCenterId: initialData.costCenterId || '',
        employmentTypeId: initialData.employmentTypeId || '',
        shiftId: initialData.shiftId || '',
        branchId: initialData.branchId || '',
        joiningDate: initialData.joiningDate ? new Date(initialData.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        basicSalary: initialData.basicSalary || 0,
        status: initialData.status || 'ACTIVE',
      });
    } else if (isOpen && !initialData) {
      setFormData({
        employeeCode: '',
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        departmentId: '',
        designationId: '',
        costCenterId: '',
        employmentTypeId: '',
        shiftId: '',
        branchId: '',
        joiningDate: new Date().toISOString().split('T')[0],
        basicSalary: 0,
        status: 'ACTIVE',
      });
    }
  }, [initialData, isOpen]);

  const { data: departments = [], isLoading: depsLoading } = useQuery({ queryKey: ['departments'], queryFn: async () => { const res = await apiClient.get('/hr-masters/departments'); return Array.isArray(res) ? res : res.data || []; }});
  
  const { data: designations = [], isLoading: desgsLoading } = useQuery({ 
    queryKey: ['designations', formData.departmentId], 
    queryFn: async () => { 
      const res = await apiClient.get(`/hr-masters/designations?departmentId=${formData.departmentId}`); 
      return Array.isArray(res) ? res : res.data || []; 
    },
    enabled: !!formData.departmentId
  });
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: async () => { const res = await apiClient.get('/hr-masters/shifts'); return Array.isArray(res) ? res : res.data || []; }});
  const { data: employmentTypes = [] } = useQuery({ queryKey: ['employment-types'], queryFn: async () => { const res = await apiClient.get('/hr-masters/employment-types'); return Array.isArray(res) ? res : res.data || []; }});
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: async () => { const res = await apiClient.get('/branches'); return Array.isArray(res) ? res : res.data || []; }});
  const { data: costCenters = [] } = useQuery({ queryKey: ['cost-centers'], queryFn: async () => { const res = await apiClient.get('/cost-centers'); return Array.isArray(res.data?.items || res.items || res.data || res) ? (res.data?.items || res.items || res.data || res) : []; }});

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (initialData?.id) {
        return apiClient.put(`/employees/${initialData.id}`, data);
      }
      return apiClient.post('/employees', data);
    },
    onSuccess: () => {
      notification.success(`Employee ${initialData ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (err: any) => notification.error(err.response?.data?.message || 'Operation failed')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.departmentId || !formData.designationId) {
      notification.error('Please select a valid Department and Designation.');
      return;
    }

    const { firstName, lastName, departmentId, designationId, costCenterId, employmentTypeId, shiftId, branchId, ...rest } = formData;
    
    const payload = {
      ...rest,
      name: `${firstName} ${lastName}`.trim(),
      basicSalary: Number(formData.basicSalary),
      ...(departmentId ? { departmentId } : {}),
      ...(designationId ? { designationId } : {}),
      ...(costCenterId ? { costCenterId } : {}),
      ...(employmentTypeId ? { employmentTypeId } : {}),
      ...(shiftId ? { shiftId } : {}),
      ...(branchId ? { branchId } : {}),
    };

    saveMutation.mutate(payload);
  };

  const handleChange = (field: string, value: any) => {
    if (field === 'departmentId') {
      setFormData(prev => ({ ...prev, departmentId: value, designationId: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Employee" : "Add Employee"} maxWidth="2xl">
      <div className="flex flex-col space-y-4">
        <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employee Code" value={formData.employeeCode} onChange={(e) => handleChange('employeeCode', e.target.value)} required />
            <Input label="Joining Date" type="date" value={formData.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} required />
            
            <Input label="First Name" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} required />
            <Input label="Last Name" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} required />
            
            <Input label="Email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} required />
            <Input label="Phone" value={formData.mobile} onChange={(e) => handleChange('mobile', e.target.value)} required />
            
            <SearchableSelect 
              label="Department" 
              value={formData.departmentId} 
              onChange={(val) => handleChange('departmentId', val)} 
              required 
              placeholder="Search Department..."
              options={departments} 
              mapOption={(d: any) => ({ label: d.name, value: d.id })}
            />
            <SearchableSelect 
              label="Designation" 
              value={formData.designationId} 
              onChange={(val) => handleChange('designationId', val)} 
              required 
              placeholder={formData.departmentId ? "Search Designation..." : "Select Department First"}
              disabled={!formData.departmentId}
              options={designations} 
              mapOption={(d: any) => ({ label: d.name, value: d.id })}
            />
            
            <Select 
              label="Cost Centre" 
              value={formData.costCenterId} 
              onChange={(e) => handleChange('costCenterId', e.target.value)} 
              options={[{label: 'Select Cost Centre', value: ''}, ...costCenters.map((c: any) => ({ label: c.name, value: c.id }))]} 
            />
            <Select 
              label="Employment Type" 
              value={formData.employmentTypeId} 
              onChange={(e) => handleChange('employmentTypeId', e.target.value)} 
              required 
              options={[{label: 'Select Employment Type', value: ''}, ...employmentTypes.map((e: any) => ({ label: e.name, value: e.id }))]} 
            />
            
            <Select 
              label="Shift" 
              value={formData.shiftId} 
              onChange={(e) => handleChange('shiftId', e.target.value)} 
              options={[{label: 'Select Shift', value: ''}, ...shifts.map((s: any) => ({ label: s.name, value: s.id }))]} 
            />
            <Select 
              label="Branch" 
              value={formData.branchId} 
              onChange={(e) => handleChange('branchId', e.target.value)} 
              options={[{label: 'Select Branch', value: ''}, ...branches.map((b: any) => ({ label: b.name, value: b.id }))]} 
            />
            
            <Input label="Basic Salary" type="number" value={formData.basicSalary} onChange={(e) => handleChange('basicSalary', e.target.value)} required />
            <Select 
              label="Status" 
              value={formData.status} 
              onChange={(e) => handleChange('status', e.target.value)} 
              options={[{label: 'Active', value: 'ACTIVE'}, {label: 'Inactive', value: 'INACTIVE'}]} 
            />
          </div>
        </form>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="employee-form" isLoading={saveMutation.isPending}>{initialData ? "Update Employee" : "Save Employee"}</Button>
        </div>
      </div>
    </Modal>
  );
}
