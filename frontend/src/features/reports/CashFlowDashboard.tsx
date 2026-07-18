import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Download, TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react';
import apiClient from '@/core/api';

export const CashFlowDashboard = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cash-flow', dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/reports/cash-flow', {
        params: { startDate: dateRange.start, endDate: dateRange.end }
      });
      return res.data;
    }
  });

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader 
        title="Cash Flow Statement" 
        description="Monitor incoming and outgoing cash" 
        primaryAction={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5 shadow-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input 
                type="date" 
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent border-none text-sm outline-none text-foreground"
              />
              <span className="text-muted-foreground">-</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent border-none text-sm outline-none text-foreground"
              />
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="primary">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="mt-8 flex justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">Total Inflow</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      ₹{Number(data?.inflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">Total Outflow</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      ₹{Number(data?.outflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-600">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface shadow-sm border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Net Cash Flow</p>
                    <h3 className={`text-3xl font-bold ${(data?.netCashFlow || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(data?.netCashFlow || 0) >= 0 ? '+' : '-'} ₹{Math.abs(Number(data?.netCashFlow || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-surface shadow-sm border-border">
              <CardHeader className="border-b border-border bg-muted/30">
                <CardTitle>Cash Flow Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-medium">Operating Activities</span>
                    </div>
                    <span className="font-medium">₹{Number(data?.operatingActivities || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="font-medium">Investing Activities</span>
                    </div>
                    <span className="font-medium">₹{Number(data?.investingActivities || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-medium">Financing Activities</span>
                    </div>
                    <span className="font-medium">₹{Number(data?.financingActivities || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-muted/10 font-bold text-lg">
                    <span>Net Change in Cash</span>
                    <span className={(data?.netCashFlow || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                      ₹{Number(data?.netCashFlow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
