import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FileText, Wallet, TrendingUp, Tags } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Dummy components for now, we will implement them next.
import { OtherIncomesList } from './components/OtherIncomesList';
import { IncomeCategoriesList } from './components/IncomeCategoriesList';

export function IncomeDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'incomes' | 'categories'>('incomes');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Other Income" 
        description="Manage service revenue, rentals, and other non-operating income"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('categories')}>
            <Tags className="w-4 h-4 mr-2" />
            Manage Categories
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center space-x-4 bg-primary/5 border-primary/20">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">This Month's Income</p>
            <h3 className="text-2xl font-bold">₹0.00</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
            <h3 className="text-2xl font-bold">0</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-green-500/10 rounded-full text-green-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Top Category</p>
            <h3 className="text-2xl font-bold">-</h3>
          </div>
        </Card>
      </div>

      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'incomes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('incomes')}
        >
          Income Receipts
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('categories')}
        >
          Income Categories
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'incomes' && <OtherIncomesList />}
        {activeTab === 'categories' && <IncomeCategoriesList />}
      </div>
    </div>
  );
}
