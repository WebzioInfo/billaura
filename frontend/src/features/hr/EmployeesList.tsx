import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer, EmptyState, LoadingState } from '@/components/ui/LayoutComponents';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';

export const EmployeesList = () => {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get('/employees');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Employees & Payroll"
        description="Manage your workforce, salaries, and HR lifecycle"
        primaryAction={
          <Button 
            onClick={() => {}}
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
          onActionClick={() => {}}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
};
