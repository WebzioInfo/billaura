import React, { useState } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Edit2, Trash2 } from 'lucide-react';
import { EmployeeModal } from './components/EmployeeModal';
import { DeleteEmployeeDialog } from './components/DeleteEmployeeDialog';
import notification from '@/core/services/NotificationService';

export const EmployeesList = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get('/employees');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/employees/${id}`),
    onSuccess: () => {
      notification.success('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete employee');
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
    }
  });

  const handleEdit = (emp: any) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (emp: any) => {
    setSelectedEmployee(emp);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedEmployee) {
      deleteMutation.mutate(selectedEmployee.id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Employees & Payroll"
        description="Manage your workforce, salaries, and HR lifecycle"
        primaryAction={
          <Button 
            onClick={() => {
              setSelectedEmployee(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 font-bold px-5"
            variant="primary"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        }
      />
      {isLoading ? (
        <LoadingState variant="table" />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-muted-foreground" />}
          title="No employees found"
          description="Add your first employee to track personnel and payroll profiles."
          actionLabel="Add Employee"
          onActionClick={() => {
            setSelectedEmployee(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-semibold py-4 px-6">Employee Code</TableHead>
                <TableHead className="font-semibold py-4 px-6">Name</TableHead>
                <TableHead className="font-semibold py-4 px-6">Type</TableHead>
                <TableHead className="font-semibold py-4 px-6">Basic Salary</TableHead>
                <TableHead className="font-semibold py-4 px-6">Status</TableHead>
                <TableHead className="font-semibold py-4 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp: any) => (
                <TableRow key={emp.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell className="font-semibold py-4 px-6">{emp.employeeCode}</TableCell>
                  <TableCell className="py-4 px-6">{emp.name}</TableCell>
                  <TableCell className="py-4 px-6">{emp.employeeType}</TableCell>
                  <TableCell className="font-semibold py-4 px-6">₹{Number(emp.basicSalary || 0).toLocaleString('en-IN')} / {emp.salaryType}</TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-semibold rounded-full">{emp.status}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(emp)}
                        title="Edit Employee"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(emp)}
                        title="Delete Employee"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <EmployeeModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        initialData={selectedEmployee}
      />
      
      <DeleteEmployeeDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        employeeName={selectedEmployee?.name || ''}
        employeeCode={selectedEmployee?.employeeCode || ''}
      />
    </PageContainer>
  );
};
