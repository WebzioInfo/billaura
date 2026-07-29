import React, { useState } from 'react';
import { useSalarySlips } from '../hooks/useHr';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card';
import { DataTable } from '../../../shared/components/ui/data-table/DataTable';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { GenerateSalaryModal } from '../components/GenerateSalaryModal';
import { PaySalaryModal } from '../components/PaySalaryModal';
import { Payslip } from '../components/Payslip';
import { apiClient } from '../../../core/api/apiClient';
import { Plus, Eye } from 'lucide-react';
import { Dialog } from '@headlessui/react';

export const PayrollDashboard: React.FC = () => {
  const { data: salarySlips = [], isLoading } = useSalarySlips();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [paySlipId, setPaySlipId] = useState<string | null>(null);
  const [viewingSlip, setViewingSlip] = useState<any | null>(null);

  const handleOpenGenerate = () => {
    setIsGenerateOpen(true);
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
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setViewingSlip(row)}>
              <Eye className="w-4 h-4 mr-1" /> View
            </Button>
            {row.status === 'GENERATED' && (
              <Button size="sm" onClick={() => setPaySlipId(row.id)}>
                Pay Now
              </Button>
            )}
          </div>
        );
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
          onClose={() => setIsGenerateOpen(false)}
        />
      )}

      {paySlipId && (
        <PaySalaryModal
          salarySlipId={paySlipId}
          onClose={() => setPaySlipId(null)}
        />
      )}

      {viewingSlip && (
        <Dialog open={true} onClose={() => setViewingSlip(null)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl">
              <div className="flex justify-end p-2 sticky top-0 bg-white border-b z-10">
                <Button variant="ghost" onClick={() => setViewingSlip(null)}>Close</Button>
              </div>
              <Payslip salarySlip={viewingSlip} company={viewingSlip.company} />
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
};
