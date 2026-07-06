import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { FileText, Wallet, TrendingUp, Tags } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

// Dummy components for now, we will implement them next.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center space-x-4 bg-primary/5 border-primary/20">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">This Month's {selectedIncomeType}</p>
            <h3 className="text-2xl font-bold">₹{thisMonthSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total {selectedIncomeType === 'Recurring Income' ? 'Invoices' : 'Receipts'}
            </p>
            <h3 className="text-2xl font-bold">{filteredIncomes.length}</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center space-x-4">
          <div className="p-3 bg-green-500/10 rounded-full text-green-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Top Category</p>
            <h3 className="text-2xl font-bold">{filteredIncomes.length > 0 ? selectedIncomeType : '-'}</h3>
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
