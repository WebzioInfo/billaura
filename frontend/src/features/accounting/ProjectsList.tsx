import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import apiClient from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

export const ProjectsList = () => {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/accounting/projects');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Project Accounting"
        description="Manage project budgets, lifecycles, and financials"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Project
          </button>
        }
      />
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4">Loading projects...</TableCell></TableRow>
            ) : projects.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-gray-500">No projects found.</TableCell></TableRow>
            ) : (
              projects.map((proj: any) => (
                <TableRow key={proj.id}>
                  <TableCell className="font-medium">{proj.name}</TableCell>
                  <TableCell>{proj.customer?.name || 'Internal'}</TableCell>
                  <TableCell>{new Date(proj.startDate).toLocaleDateString()}</TableCell>
                  <TableCell className="font-semibold">${Number(proj.budget).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{proj.status}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
