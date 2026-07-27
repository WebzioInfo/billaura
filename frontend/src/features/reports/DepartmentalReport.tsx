import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '../../core/api/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { PageContainer, LoadingState } from '../../shared/components/ui/LayoutComponents';
import { Building, Users, DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export const DepartmentalReport: React.FC = () => {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['departmental-report'],
    queryFn: async () => {
      const res = await api.get<any>('/reports/departmental');
      return res.data || res;
    }
  });

  const summary = reportData?.departmentalSummary || [];
  const designationSummary = reportData?.designationSummary || [];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Grand totals
  const totalHeadcount = summary.reduce((acc: number, item: any) => acc + item.headcount, 0);
  const totalSalary = summary.reduce((acc: number, item: any) => acc + item.salaryCost, 0);
  const totalExpenses = summary.reduce((acc: number, item: any) => acc + item.expenseCost, 0);
  const totalIncome = summary.reduce((acc: number, item: any) => acc + item.incomeValue, 0);
  const totalProfit = totalIncome - totalExpenses - totalSalary;

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Departmental Performance Report"
        description="Headcount division, payroll cost allocations, department expenses, and net profit margins."
      />

      {isLoading ? (
        <LoadingState variant="card" />
      ) : (
        <div className="space-y-6 text-left">
          {/* Executive Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 bg-surface border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Headcount</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{totalHeadcount} Employees</h3>
                </div>
                <Users className="w-8 h-8 text-accent opacity-80" />
              </div>
            </Card>

            <Card className="p-6 bg-surface border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Salary Cost</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalSalary)}</h3>
                </div>
                <DollarSign className="w-8 h-8 text-green-500 opacity-80" />
              </div>
            </Card>

            <Card className="p-6 bg-surface border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Expenses</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalExpenses)}</h3>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500 opacity-80" />
              </div>
            </Card>

            <Card className="p-6 bg-surface border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Profit Contribution</p>
                  <h3 className={`text-2xl font-bold mt-2 ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(totalProfit)}
                  </h3>
                </div>
                <TrendingUp className={`w-8 h-8 opacity-80 ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </Card>
          </div>

          {/* Department Breakdown Table */}
          <Card className="p-6 bg-surface border border-border">
            <h3 className="font-bold text-lg text-foreground mb-4">Department Cost Centers Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Headcount</th>
                    <th className="py-3 px-4 text-right">Salary Cost</th>
                    <th className="py-3 px-4 text-right">Direct Expenses</th>
                    <th className="py-3 px-4 text-right">Assigned Income</th>
                    <th className="py-3 px-4 text-right">Net Profitability</th>
                    <th className="py-3 px-4 text-center">Attendance (P/A/L)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((item: any) => (
                    <tr key={item.departmentId} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {item.departmentName}
                        <p className="text-[10px] text-muted-foreground font-mono font-normal mt-0.5">{item.departmentCode}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center text-sm font-semibold text-foreground">{item.headcount}</td>
                      <td className="py-3.5 px-4 text-right text-sm font-semibold text-foreground">{formatCurrency(item.salaryCost)}</td>
                      <td className="py-3.5 px-4 text-right text-sm font-semibold text-foreground">{formatCurrency(item.expenseCost)}</td>
                      <td className="py-3.5 px-4 text-right text-sm font-semibold text-foreground">{formatCurrency(item.incomeValue)}</td>
                      <td className={`py-3.5 px-4 text-right text-sm font-bold ${item.profitability >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(item.profitability)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-muted-foreground">
                        <span className="text-green-500 font-semibold">{item.attendance?.present}P</span> /{' '}
                        <span className="text-red-500 font-semibold">{item.attendance?.absent}A</span> /{' '}
                        <span className="text-amber-500 font-semibold">{item.attendance?.leave}L</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Designation Grid */}
          <Card className="p-6 bg-surface border border-border">
            <h3 className="font-bold text-lg text-foreground mb-4">Designation Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {designationSummary.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-background rounded-xl border border-border flex items-center justify-between">
                  <div className="truncate">
                    <p className="text-xs text-muted-foreground truncate">{item.designationName}</p>
                    <h4 className="text-lg font-bold text-foreground mt-1">{item.count} Employees</h4>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
};
