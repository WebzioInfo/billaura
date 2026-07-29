import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import notification from '@/core/services/NotificationService';
import apiClient from '@/core/api';
import { Modal } from '@/shared/components/ui/Modal';
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect';

interface Props {
  onClose: () => void;
}

export const GenerateSalaryModal: React.FC<Props> = ({ onClose }) => {
  const { register, handleSubmit } = useForm();
  const queryClient = useQueryClient();
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: async () => { const res = await apiClient.get('/hr-masters/departments'); return Array.isArray(res) ? res : res.data || []; }});
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: async () => { const res = await apiClient.get('/branches'); return Array.isArray(res) ? res : res.data || []; }});

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/salary-slips/generate', data),
    onSuccess: (res: any) => {
      notification.success(`Successfully generated payroll for ${res.data?.generated || 'employees'}`);
      queryClient.invalidateQueries({ queryKey: ['salarySlips'] });
      onClose();
    },
    onError: (err: any) => notification.error(err.response?.data?.message || 'Generation failed')
  });

  const onSubmit = (data: any) => {
    generateMutation.mutate({
      month: parseInt(data.month),
      year: parseInt(data.year),
      ...(departmentId ? { departmentId } : {}),
      ...(branchId ? { branchId } : {}),
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Generate Payroll" maxWidth="md">
      <div className="flex flex-col space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          This will calculate salaries for all active employees for the selected month, taking into account their attendance, basic salary, and standard components.
        </p>
        <form id="generate-payroll-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium">Month (1-12)</label>
              <input
                type="number"
                min="1"
                max="12"
                defaultValue={new Date().getMonth() + 1}
                {...register('month', { required: true })}
                className="mt-1 block w-full rounded-md border-border bg-background p-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium">Year</label>
              <input
                type="number"
                min="2000"
                defaultValue={new Date().getFullYear()}
                {...register('year', { required: true })}
                className="mt-1 block w-full rounded-md border-border bg-background p-2"
              />
            </div>
          </div>

          <SearchableSelect 
            label="Department Filter (Optional)" 
            value={departmentId} 
            onChange={(val) => setDepartmentId(val)} 
            placeholder="All Departments"
            options={departments} 
            mapOption={(d: any) => ({ label: d.name, value: d.id })}
          />

          <SearchableSelect 
            label="Branch Filter (Optional)" 
            value={branchId} 
            onChange={(val) => setBranchId(val)} 
            placeholder="All Branches"
            options={branches} 
            mapOption={(b: any) => ({ label: b.name, value: b.id })}
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={generateMutation.isPending}>
              Generate Payroll
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
