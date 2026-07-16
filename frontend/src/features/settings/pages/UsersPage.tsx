import React from 'react';
import { PageContainer } from '@/components/ui/LayoutComponents';
import { PageHeader } from '@/components/ui/PageHeader';
import { UsersList } from '../../users/UsersList';

export const UsersPage = () => {
  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="User Management"
        description="Manage system users, their access levels, and status."
      />
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6 overflow-hidden">
        <UsersList />
      </div>
    </PageContainer>
  );
};
