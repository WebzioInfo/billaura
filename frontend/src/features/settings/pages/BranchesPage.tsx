import React from 'react';
import { PageContainer } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { BranchesList } from '../../branches/BranchesList';
import { Building2 } from 'lucide-react';

export const BranchesPage = () => {
  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Branch Management"
        description="Manage your enterprise locations and branches."
      />
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6 overflow-hidden">
        <BranchesList />
      </div>
    </PageContainer>
  );
};
