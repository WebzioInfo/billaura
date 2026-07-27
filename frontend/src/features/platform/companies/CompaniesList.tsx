import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Button } from '../../../shared/components/ui/Button';
import { Table } from '../../../shared/components/ui/Table';
import { Badge } from '../../../shared/components/ui/Badge';
import { Plus, Edit, Eye, Trash, LogIn, Power } from 'lucide-react';

export const CompaniesList = () => {
  const navigate = useNavigate();

  // Mock data for now, ideally fetch from API via React Query
  const companies = [
    {
      id: '1',
      logo: 'https://via.placeholder.com/40',
      companyName: 'Acme Corp',
      tenantCode: 'ACME01',
      subscription: 'Enterprise',
      status: 'ACTIVE',
      branchesCount: 3,
      usersCount: 15,
      storageUsed: '1.2 GB',
      createdAt: '2025-01-15T10:00:00Z',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Companies"
        description="Manage tenants and their subscription environments"
        primaryAction={
          <Button onClick={() => navigate('/platform/companies/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Provision Tenant
          </Button>
        }
      />

      <div className="bg-white rounded-lg shadow border border-slate-200">
        <Table>
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Company</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Tenant Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Subscription</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Usage</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <img src={c.logo} alt={c.companyName} className="w-8 h-8 rounded bg-slate-200 object-cover" />
                    <div>
                      <div className="font-medium text-slate-900">{c.companyName}</div>
                      <div className="text-xs text-slate-500">Created: {new Date(c.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.tenantCode}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.subscription}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.status === 'ACTIVE' ? 'success' : 'default'}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  <div>{c.branchesCount} Branches | {c.usersCount} Users</div>
                  <div className="text-xs text-slate-500">{c.storageUsed} Storage</div>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/platform/companies/${c.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <LogIn className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                    <Power className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No companies found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};
