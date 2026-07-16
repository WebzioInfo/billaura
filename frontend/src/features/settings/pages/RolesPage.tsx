import React from 'react';
import { PageContainer } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { RolesList } from '../../roles/RolesList';

export const RolesPage = () => {
  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Roles & Permissions"
        description="Manage organizational roles and access control policies."
      />
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6 overflow-hidden">
        <RolesList />
      </div>
    </PageContainer>
  );
};
