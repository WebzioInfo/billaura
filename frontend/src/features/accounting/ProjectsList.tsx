import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge, DateCell, CurrencyCell } from '@/shared/components/ui';
import apiClient from '@/core/api';
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 pr-4">Project Name</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead align="right">Budget</TableHead>
            <TableHead align="center" className="pr-6 pl-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="p-0">
                <TableLoader rows={4} />
              </TableCell>
            </TableRow>
          ) : projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                No projects found.
              </TableCell>
            </TableRow>
          ) : (
            projects.map((proj: any) => (
              <TableRow key={proj.id}>
                <TableCell className="pl-6 pr-4 font-semibold text-foreground">{proj.name}</TableCell>
                <TableCell className="text-muted-foreground">{proj.customer?.name || 'Internal'}</TableCell>
                <DateCell date={proj.startDate} />
                <CurrencyCell amount={Number(proj.budget || 0)} className="font-semibold text-foreground" />
                <TableCell align="center" className="pr-6 pl-4">
                  <StatusBadge status={proj.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};


