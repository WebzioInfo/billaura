import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '../../core/api/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { PageContainer, LoadingState } from '../../shared/components/ui/LayoutComponents';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../shared/components/ui/Table';
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
    <PageContainer
      maxWidth="7xl"
      isLoading={isLoading && summary.length === 0}
      loadingTitle="Loading Departmental Report..."
      loadingDescription="Aggregating department headcount and cost allocations..."
    >
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
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-foreground">Department Cost Centers Breakdown</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Headcount</TableHead>
                  <TableHead className="text-right">Salary Cost</TableHead>
                  <TableHead className="text-right">Direct Expenses</TableHead>
                  <TableHead className="text-right">Assigned Income</TableHead>
                  <TableHead className="text-right">Net Profitability</TableHead>
                  <TableHead className="text-center">Attendance (P/A/L)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((item: any) => (
                  <TableRow key={item.departmentId}>
                    <TableCell className="font-medium text-foreground">
                      <div>
                        {item.departmentName}
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.departmentCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium text-foreground">{item.headcount}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-foreground tabular-nums">{formatCurrency(item.salaryCost)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-foreground tabular-nums">{formatCurrency(item.expenseCost)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-foreground tabular-nums">{formatCurrency(item.incomeValue)}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold tabular-nums ${item.profitability >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(item.profitability)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      <span className="text-green-600 dark:text-green-400 font-semibold">{item.attendance?.present || 0}P</span> /{' '}
                      <span className="text-red-500 dark:text-red-400 font-semibold">{item.attendance?.absent || 0}A</span> /{' '}
                      <span className="text-amber-500 dark:text-amber-400 font-semibold">{item.attendance?.leave || 0}L</span>
                    </TableCell>
                  </TableRow>
                ))}
                {summary.length > 0 && (
                  <TableRow isTotalRow>
                    <TableCell className="font-semibold text-foreground">Total</TableCell>
                    <TableCell className="text-center font-semibold text-foreground">{totalHeadcount}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground tabular-nums">{formatCurrency(totalSalary)}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground tabular-nums">{formatCurrency(totalExpenses)}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground tabular-nums">{formatCurrency(totalIncome)}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(totalProfit)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
