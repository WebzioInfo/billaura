import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Download, Printer, FileText, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { apiClient } from '@/core/api/apiClient';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
};
import { 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';
import notification from '@/core/services/NotificationService';
import { useQuery } from '@tanstack/react-query';

export default function ProfitLossDashboard() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    cogs: true,
    operatingExpenses: true,
    otherIncome: true,
    otherExpenses: true
  });
  const [dateRange, setDateRange] = useState('FY');

  const { data, isLoading: loading } = useQuery({
    queryKey: ['reports', 'profit-loss', dateRange],
    queryFn: async () => {
      const response = await apiClient.get('/api/reports/profit-loss', {
        params: { dateRange }
      });
      return response.data;
    }
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getTableData = () => {
    return [
      { account: 'Revenue', balance: '' },
      { account: 'Sales Revenue', balance: formatCurrency(data?.statement?.revenue?.grossRevenue || 0) },
      { account: 'Cost of Goods Sold', balance: formatCurrency(data?.statement?.cogs?.total || 0) },
      { account: 'Gross Profit', balance: formatCurrency(data?.statement?.grossProfit || 0) },
      { account: 'Operating Expenses', balance: formatCurrency(data?.statement?.operatingExpenses?.total || 0) },
      { account: 'Operating Profit', balance: formatCurrency(data?.statement?.operatingProfit || 0) },
      { account: 'Net Profit', balance: formatCurrency(data?.statement?.netProfit || 0) },
    ];
  };

  const getExcelData = () => {
    return [
      ['Revenue', data?.statement?.revenue?.grossRevenue || 0],
      ['Cost of Goods Sold', data?.statement?.cogs?.total || 0],
      ['Gross Profit', data?.statement?.grossProfit || 0],
      ['Operating Expenses', data?.statement?.operatingExpenses?.total || 0],
      ['Operating Profit', data?.statement?.operatingProfit || 0],
      ['Net Profit', data?.statement?.netProfit || 0],
    ];
  };

  const exportPDF = async () => {
    await DocumentEngine.generateTablePDF({
      title: 'Profit & Loss Statement',
      subtitle: `Generated for ${dateRange} on ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Account', dataKey: 'account', width: 100 },
        { header: 'Balance', dataKey: 'balance', align: 'right' }
      ],
      data: getTableData()
    });
    
    notification.success('PDF Exported Successfully');
  };

  const exportExcel = () => {
    ExportService.exportExcel({
      filename: 'Profit_Loss_Statement.xlsx',
      sheetName: 'Profit & Loss',
      title: 'Profit & Loss Statement',
      headers: ['Account', 'Balance'],
      data: getExcelData()
    });
    notification.success('Excel Exported Successfully');
  };

  const handlePrint = async () => {
    const doc = DocumentEngine.generateTablePDF({
      title: 'Profit & Loss Statement',
      subtitle: `Generated for ${dateRange} on ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Account', dataKey: 'account', width: 100 },
        { header: 'Balance', dataKey: 'balance', align: 'right' }
      ],
      data: getTableData()
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading Financial Data...</span>
      </div>
    );
  }

  const { statement, kpis } = data || {};
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">Detailed financial performance for the selected period.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="FY">This Financial Year</option>
            <option value="MTD">This Month</option>
            <option value="QTD">This Quarter</option>
          </select>
          <Button variant="outline" onClick={exportPDF}><FileText className="w-4 h-4 mr-2" /> PDF</Button>
          <Button variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-2" /> Excel</Button>
          <Button variant="outline" onClick={handlePrint} className="hidden sm:flex"><Printer className="w-4 h-4 mr-2" /> Print</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(kpis?.totalRevenue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.grossProfit || 0)}</div>
            <p className="text-xs text-muted-foreground">{kpis?.grossMarginPct?.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Operating Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(kpis?.operatingExpense || 0)}</div>
            <p className="text-xs text-muted-foreground">{kpis?.expenseRatioPct?.toFixed(1)}% of revenue</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.netProfit || 0)}</div>
            <p className="text-xs opacity-80">{kpis?.netMarginPct?.toFixed(1)}% net margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Statement & Charts Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* P&L Table */}
        <div className="md:col-span-2">
          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle>Financial Statement</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full text-sm">
                
                {/* Revenue Section */}
                <div className="border-b">
                  <div 
                    className="flex justify-between items-center p-3 font-semibold bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => toggleSection('revenue')}
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.revenue ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                      <span>Revenue</span>
                    </div>
                    <span>{formatCurrency(statement?.netRevenue || 0)}</span>
                  </div>
                  {expandedSections.revenue && (
                    <div className="p-3 pl-10 space-y-2 bg-background">
                      {statement?.revenue?.salesRevenue?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                          <span>{item.name}</span>
                          <span>{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      {statement?.revenue?.salesRevenue?.length === 0 && <div className="text-muted-foreground italic text-xs">No sales revenue records</div>}
                    </div>
                  )}
                </div>

                {/* COGS Section */}
                <div className="border-b">
                  <div 
                    className="flex justify-between items-center p-3 font-semibold bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => toggleSection('cogs')}
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.cogs ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                      <span>Cost of Goods Sold</span>
                    </div>
                    <span className="text-red-500">{formatCurrency(statement?.cogs?.total || 0)}</span>
                  </div>
                  {expandedSections.cogs && (
                    <div className="p-3 pl-10 space-y-2 bg-background">
                      {statement?.cogs?.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                          <span>{item.name}</span>
                          <span className="text-red-500">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      {statement?.cogs?.items?.length === 0 && <div className="text-muted-foreground italic text-xs">No COGS records</div>}
                    </div>
                  )}
                </div>

                {/* Gross Profit Summary */}
                <div className="flex justify-between items-center p-4 font-bold bg-muted border-b text-base">
                  <span>Gross Profit</span>
                  <span>{formatCurrency(statement?.grossProfit || 0)}</span>
                </div>

                {/* Operating Expenses Section */}
                <div className="border-b">
                  <div 
                    className="flex justify-between items-center p-3 font-semibold bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => toggleSection('operatingExpenses')}
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.operatingExpenses ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                      <span>Operating Expenses</span>
                    </div>
                    <span className="text-red-500">{formatCurrency(statement?.operatingExpenses?.total || 0)}</span>
                  </div>
                  {expandedSections.operatingExpenses && (
                    <div className="p-3 pl-10 space-y-2 bg-background max-h-[300px] overflow-y-auto">
                      {statement?.operatingExpenses?.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                          <span>{item.name}</span>
                          <span className="text-red-500">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      {statement?.operatingExpenses?.items?.length === 0 && <div className="text-muted-foreground italic text-xs">No expense records</div>}
                    </div>
                  )}
                </div>

                {/* Operating Profit Summary */}
                <div className="flex justify-between items-center p-4 font-bold bg-muted border-b text-base">
                  <span>Operating Profit</span>
                  <span>{formatCurrency(statement?.operatingProfit || 0)}</span>
                </div>

                {/* Other Income/Expenses */}
                <div className="border-b">
                  <div 
                    className="flex justify-between items-center p-3 font-semibold bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => toggleSection('otherIncome')}
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.otherIncome ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                      <span>Other Income / (Expenses)</span>
                    </div>
                    <span>{formatCurrency((statement?.otherIncome?.total || 0) - (statement?.otherExpenses?.total || 0))}</span>
                  </div>
                </div>

                {/* Net Profit Summary */}
                <div className="flex justify-between items-center p-5 font-bold bg-primary text-primary-foreground text-lg rounded-b-lg">
                  <span>Net Profit</span>
                  <span>{formatCurrency(statement?.netProfit || 0)}</span>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Analytics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'COGS', value: statement?.cogs?.total || 0 },
                        { name: 'Operating', value: statement?.operatingExpenses?.total || 0 },
                        { name: 'Other', value: statement?.otherExpenses?.total || 0 },
                      ].filter(d => d.value > 0)}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Summary Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Gross Margin</span>
                    <span className="font-medium">{kpis?.grossMarginPct?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(kpis?.grossMarginPct || 0, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Net Margin</span>
                    <span className="font-medium">{kpis?.netMarginPct?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(kpis?.netMarginPct || 0, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
