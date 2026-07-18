import React, { useState } from 'react';
import { useSalarySlips } from '../hooks/useHr';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card';
import { DataTable } from '../../../shared/components/ui/data-table/DataTable';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { GenerateSalaryModal } from '../components/GenerateSalaryModal';
import { PaySalaryModal } from '../components/PaySalaryModal';
import { apiClient } from '../../../core/api/apiClient';
import { Plus } from 'lucide-react';

export const PayrollDashboard: React.FC = () => {
  const { data: salarySlips = [], isLoading } = useSalarySlips();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [paySlipId, setPaySlipId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  const handleOpenGenerate = () => {
    apiClient.get('/hr/employees').then((res) => {
      setEmployees(res.data);
      setIsGenerateOpen(true);
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const columns = [
    {
      header: 'Employee',
      accessorKey: 'employee.name',
    },
    {
      header: 'Month/Year',
      accessorFn: (row: any) => `${row.month}/${row.year}`,
    },
    {
      header: 'Net Salary',
      accessorKey: 'netSalary',
      cell: (info: any) => formatCurrency(info.getValue()),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (info: any) => (
        <Badge variant={info.getValue() === 'PAID' ? 'success' : 'info'}>
          {info.getValue()}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (info: any) => {
        const row = info.row.original;
        if (row.status === 'GENERATED') {
          return (
            <Button size="sm" onClick={() => setPaySlipId(row.id)}>
              Pay Now
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Payroll Engine</h1>
        <Button onClick={handleOpenGenerate}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Salary Slip
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary Slips</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as any}
            data={salarySlips}
            searchKey="employee.name"
          />
        </CardContent>
      </Card>

      {isGenerateOpen && (
        <GenerateSalaryModal
          employees={employees}
          onClose={() => setIsGenerateOpen(false)}
        />
      )}

      {paySlipId && (
        <PaySalaryModal
          salarySlipId={paySlipId}
          onClose={() => setPaySlipId(null)}
        />
      )}
    </div>
  );
};
