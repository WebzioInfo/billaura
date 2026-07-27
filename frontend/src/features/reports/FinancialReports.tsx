import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { FileText, BookOpen, Activity, Landmark, LineChart, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FinancialReports = () => {
  const navigate = useNavigate();

  const reports = [
    { title: 'Profit & Loss', icon: Activity, path: '/profit-loss', desc: 'View revenue, costs, and expenses' },
    { title: 'Balance Sheet', icon: Landmark, path: '/balance-sheet', desc: 'View assets, liabilities, and equity' },
    { title: 'Trial Balance', icon: BookOpen, path: '/trial-balance', desc: 'Verify that debits equal credits' },
    { title: 'General Ledger', icon: FileText, path: '/general-ledger', desc: 'Detailed transactions by account' },
    { title: 'Day Book', icon: LineChart, path: '/day-book', desc: 'Daily transaction summary' },
    { title: 'Departmental Performance', icon: Building, path: '/reports/departmental', desc: 'Inspect department headcount, payroll cost, and profitability' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground">Comprehensive financial statements and accounting reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(report.path)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{report.title}</CardTitle>
              <report.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{report.desc}</p>
              <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); navigate(report.path); }}>
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
