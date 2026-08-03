import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { FileText, Wallet, TrendingUp, Tags } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '../../core/api/apiClient';

import { OtherIncomesList } from './components/OtherIncomesList';
import { IncomeCategoriesList } from './components/IncomeCategoriesList';

const VALID_INCOME_TYPES = [
  'Other Income',
  'Service Income',
  'Rental Income',
  'Interest Income',
  'Recurring Income'
] as const;

type IncomeType = typeof VALID_INCOME_TYPES[number];

export function IncomeDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const getQueryTab = () => searchParams.get('tab') === 'categories' ? 'categories' : 'incomes';
  
  const [activeTab, setActiveTab] = useState<'overview' | 'incomes' | 'categories'>(getQueryTab());

  useEffect(() => {
    setActiveTab(getQueryTab());
  }, [searchParams]);

  const handleTabChange = (tab: 'incomes' | 'categories') => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const typeParam = searchParams.get('type') || '';
  const matchedType = VALID_INCOME_TYPES.find(
    (t) => t.toLowerCase() === typeParam.toLowerCase()
  );
  const selectedIncomeType: IncomeType = matchedType || 'Other Income';

  // Set document/window title
  useEffect(() => {
    document.title = `${selectedIncomeType} | Bill Aura`;
  }, [selectedIncomeType]);

  // Fetch incomes to compute dynamic stats
  const { data: incomes = [] } = useQuery({
    queryKey: ['other-incomes'],
    queryFn: async () => {
      const { data } = await api.get('/other-incomes');
      return data || [];
    }
  });

  const filteredIncomes = incomes.filter((income: any) => {
    const categoryName = income.category?.name || '';
    return categoryName.toLowerCase() === selectedIncomeType.toLowerCase();
  });

  const now = new Date();
  const currentMonthIncomes = filteredIncomes.filter((income: any) => {
    const d = new Date(income.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const thisMonthSum = currentMonthIncomes.reduce(
    (sum: number, income: any) => sum + (Number(income.grandTotal) || 0),
    0
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader 
        title={selectedIncomeType} 
        description={`Manage ${selectedIncomeType.toLowerCase()} and related revenue details`}
        breadcrumbs={[
          { label: 'Income', href: `/other-income?type=${selectedIncomeType}` },
          { label: selectedIncomeType }
        ]}
        primaryAction={
          <Button variant="outline" onClick={() => handleTabChange('categories')}>
            <Tags className="w-4 h-4 mr-2" />
            Manage Categories
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20 p-3 rounded-lg border flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground leading-none">₹{thisMonthSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="p-1 bg-primary/10 text-primary rounded">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <p className="font-semibold text-muted-foreground uppercase tracking-wider">This Month's Income</p>
          </div>
        </Card>
        <Card className="p-3 rounded-lg border flex flex-col justify-between bg-surface shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground leading-none">{filteredIncomes.length}</h3>
            <div className="p-1 bg-blue-500/10 text-blue-500 rounded">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <p className="font-semibold text-muted-foreground uppercase tracking-wider">
              Total {selectedIncomeType === 'Recurring Income' ? 'Invoices' : 'Receipts'}
            </p>
          </div>
        </Card>
        <Card className="p-3 rounded-lg border flex flex-col justify-between bg-surface shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground leading-none truncate max-w-[150px]">{filteredIncomes.length > 0 ? selectedIncomeType : '-'}</h3>
            <div className="p-1 bg-green-500/10 text-green-500 rounded">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <p className="font-semibold text-muted-foreground uppercase tracking-wider">Top Category</p>
          </div>
        </Card>
      </div>

      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'incomes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleTabChange('incomes')}
        >
          Income Receipts
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleTabChange('categories')}
        >
          Income Categories
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'incomes' && <OtherIncomesList selectedIncomeType={selectedIncomeType} />}
        {activeTab === 'categories' && <IncomeCategoriesList />}
      </div>
    </div>
  );
}
