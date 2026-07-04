import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/ui/LayoutComponents';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const BillForm = () => {
  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Create Bill"
        description="Record a new purchase bill"
        backTo={{ label: 'Bills', path: '/bills' }}
        primaryAction={
          <Button variant="primary" className="font-bold px-5">
            Save Bill
          </Button>
        }
      />
      <Card className="p-6">
        <p className="text-muted-foreground text-sm">Bill form implementation goes here.</p>
      </Card>
    </PageContainer>
  );
};
