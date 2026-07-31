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
import { Plus, Eye, CheckCircle, Trash2, Ban } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';

export const PayrollDashboard: React.FC = () => {
  const { data: salarySlips = [], isLoading } = useSalarySlips();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [paySlipId, setPaySlipId] = useState<string | null>(null);
  const [viewingSlip, setViewingSlip] = useState<any | null>(null);

  const handleOpenGenerate = () => {
    window.location.href = '/app/hr/payroll/generate';
  };

  const handleApprove = async (id: string) => {
    if (confirm('Are you sure you want to approve this payroll?')) {
      await apiClient.post(`/hr/salary-slips/${id}/approve`);
      window.location.reload();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this draft payroll?')) {
      await apiClient.delete(`/hr/salary-slips/${id}`);
      window.location.reload();
    }
  };

  const handleVoid = async (id: string) => {
    const reason = prompt('Please enter a reason for voiding this payroll:');
    if (reason) {
      await apiClient.post(`/hr/salary-slips/${id}/void`, { reason });
      window.location.reload();
    }
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
      header: 'Payroll Period',
      accessorFn: (row: any) => `${new Date(row.startDate).toLocaleDateString()} - ${new Date(row.endDate).toLocaleDateString()}`,
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
            <Button variant="outline" size="sm" onClick={() => setViewingSlip(row)}>
              <Eye className="w-4 h-4" />
            </Button>
            {row.status === 'DRAFT' || row.status === 'GENERATED' ? (
              <>
                <Button variant="outline" size="sm" onClick={() => handleApprove(row.id)} title="Approve">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(row.id)} title="Delete Draft">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </>
            ) : null}
            {row.status === 'APPROVED' && (
              <Button size="sm" onClick={() => setPaySlipId(row.id)}>
                Pay Salary
              </Button>
            )}
            {row.status === 'PAID' && (
              <Button variant="outline" size="sm" onClick={() => handleVoid(row.id)} title="Void Paid Slip">
                <Ban className="w-4 h-4 text-orange-600" />
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
        <Modal 
          isOpen={true} 
          onClose={() => setViewingSlip(null)} 
          title={`Payslip - ${viewingSlip.employee?.name || 'Employee'}`}
          maxWidth="4xl"
        >
          <Payslip salarySlip={viewingSlip} company={viewingSlip.company} />
        </Modal>
      )}
    </div>
  );
};
