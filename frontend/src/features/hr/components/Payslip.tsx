import React from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Download, Printer, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatters';

interface PayslipProps {
  salarySlip: any;
  company: any;
}

export const Payslip: React.FC<PayslipProps> = ({ salarySlip, company }) => {
  if (!salarySlip) return null;

  const emp = salarySlip.employee;
  const earnings = salarySlip.earningsBreakdown || {};
  const deductions = salarySlip.deductionsBreakdown || {};
  const attendance = salarySlip.attendanceSummary || {};

  return (
    <Card className="max-w-4xl mx-auto p-8 bg-white text-slate-900 shadow-lg border border-slate-200">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{company?.name || ''}</h1>
          <p className="text-slate-500 mt-1 text-sm">{company?.address || ''}</p>
          {company?.email && <p className="text-slate-500 mt-0.5 text-sm">{company.email}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold text-accent uppercase tracking-wider">Payslip</h2>
          <p className="text-slate-500 font-medium">{new Date(salarySlip.year, salarySlip.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Employee Details & Attendance Summary */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Employee Details</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-slate-500">Employee Name:</span>
            <span className="font-medium">{emp?.name}</span>
            <span className="text-slate-500">Employee Code:</span>
            <span className="font-medium">{emp?.employeeCode}</span>
            <span className="text-slate-500">Designation:</span>
            <span className="font-medium">{emp?.designation?.name || '-'}</span>
            <span className="text-slate-500">Department:</span>
            <span className="font-medium">{emp?.department?.name || '-'}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Attendance Summary</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-slate-500">Total Paid Days:</span>
            <span className="font-medium">{salarySlip.paidDays}</span>
            <span className="text-slate-500">Loss of Pay Days:</span>
            <span className="font-medium">{salarySlip.absentDays}</span>
            <span className="text-slate-500">Present:</span>
            <span className="font-medium">{attendance.present || 0}</span>
            <span className="text-slate-500">Leaves:</span>
            <span className="font-medium">{attendance.leave || 0}</span>
          </div>
          {attendance.formula && (
            <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-100 text-xs text-slate-500 font-mono">
              Calculation: {attendance.formula}
            </div>
          )}
        </div>
      </div>

      {/* Salary Details Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
        <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200">
          <div className="p-3 font-semibold text-slate-700">Earnings</div>
          <div className="p-3 font-semibold text-slate-700 border-l border-slate-200">Deductions</div>
        </div>
        
        <div className="grid grid-cols-2">
          {/* Earnings Column */}
          <div className="p-4 space-y-3 border-r border-slate-200">
            {Object.entries(earnings).map(([name, data]: any, idx) => (
              <div key={idx} className="flex justify-between text-sm group">
                <div className="flex flex-col">
                  <span className="text-slate-700">{name}</span>
                  {data.formula && data.formula !== "Base Component" && data.formula !== "Flat Amount" && (
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{data.formula}</span>
                  )}
                </div>
                <span className="font-medium text-slate-800">{formatCurrency(data.amount)}</span>
              </div>
            ))}
            {Number(salarySlip.bonus) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Bonus</span>
                <span className="font-medium text-slate-800">{formatCurrency(salarySlip.bonus)}</span>
              </div>
            )}
          </div>
          
          {/* Deductions Column */}
          <div className="p-4 space-y-3">
            {Object.entries(deductions).map(([name, data]: any, idx) => (
              <div key={idx} className="flex justify-between text-sm group">
                <div className="flex flex-col">
                  <span className="text-slate-700">{name}</span>
                  {data.formula && data.formula !== "Flat Amount" && (
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{data.formula}</span>
                  )}
                </div>
                <span className="font-medium text-red-600">-{formatCurrency(data.amount)}</span>
              </div>
            ))}
            {Number(salarySlip.advances) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Advance Repayment</span>
                <span className="font-medium text-red-600">-{formatCurrency(salarySlip.advances)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Totals */}
        <div className="grid grid-cols-2 bg-slate-50 border-t border-slate-200 font-bold">
          <div className="p-3 flex justify-between border-r border-slate-200">
            <span>Gross Earnings</span>
            <span className="text-slate-800">{formatCurrency(Number(salarySlip.basicSalary) + Number(salarySlip.allowances) + Number(salarySlip.bonus))}</span>
          </div>
          <div className="p-3 flex justify-between">
            <span>Total Deductions</span>
            <span className="text-red-600">{formatCurrency(Number(salarySlip.deductions))}</span>
          </div>
        </div>
      </div>

      {/* Net Salary */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 flex justify-between items-center mb-8">
        <div>
          <h3 className="text-accent font-bold text-lg">Net Salary Payable</h3>
          <p className="text-sm text-slate-500">Amount transferred to bank account</p>
        </div>
        <div className="text-3xl font-black text-accent">
          {formatCurrency(salarySlip.netSalary)}
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="flex justify-between items-end mt-12 pt-8 border-t border-slate-100">
        <div className="text-xs text-slate-400">
          <p>This is a system generated payslip.</p>
          <p>Generated on {new Date(salarySlip.generatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
          <CheckCircle className="w-4 h-4" /> Digitally Signed by HR
        </div>
      </div>

      {/* Actions (Not printable) */}
      <div className="flex justify-end gap-3 mt-8 print:hidden">
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button variant="primary" className="gap-2">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
      </div>
    </Card>
  );
};


