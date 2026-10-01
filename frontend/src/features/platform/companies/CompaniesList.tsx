import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Button } from '../../../shared/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../shared/components/ui/Table';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import { Plus, Eye, LogIn, Power } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';

export const CompaniesList = () => {
  const navigate = useNavigate();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['platform-companies'],
    queryFn: async () => {
      const res = await apiClient.get('/companies');
      return res.data?.data || res.data || [];
    }
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Companies"
        description="Manage tenants and their subscription environments"
        primaryAction={
          <Button onClick={() => navigate('/platform/companies/new')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Provision Tenant
          </Button>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Tenant Code</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                Loading tenants...
              </TableCell>
            </TableRow>
          ) : companies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No companies found. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            companies.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-foreground">
                  <div>
                    <div className="font-medium text-foreground">{c.companyName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Created: {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.tenantCode}</TableCell>
                <TableCell className="text-foreground">{c.subscription}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="text-foreground">{c.branchesCount} Branches | {c.usersCount} Users</div>
                  <div className="text-[11px] text-muted-foreground">{c.storageUsed} Storage</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/platform/companies/${c.id}`)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[#EAEAEA] dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="View Tenant"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[#EAEAEA] dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Impersonate Tenant"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                      title="Power Toggle"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
