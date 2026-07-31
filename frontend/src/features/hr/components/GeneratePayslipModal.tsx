import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import notification from '@/core/services/NotificationService';
import { Calculator, CheckCircle2, ChevronRight, Download, Printer, Mail, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatters';

interface GeneratePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export const GeneratePayslipModal: React.FC<GeneratePayslipModalProps> = ({ isOpen, onClose, employee }) => {
  const [step, setStep] = useState(1);
  const [periodType, setPeriodType] = useState('Monthly');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !employee) return null;

  const basicSalary = Number(employee.basicSalary) || 45000;
  const allowances = 15000;
  const overtime = 2500;
  const deductions = 4800;
  const grossSalary = basicSalary + allowances + overtime;
  const netSalary = grossSalary - deductions;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setStep(3);
      notification.success(`Payslip generated for ${employee.name}`);
    }, 1000);
  };

  const handleAction = (action: string) => {
    notification.success(`${action} completed for ${employee.name}'s payslip.`);
    if (action === 'Download PDF') {
      const element = document.createElement("a");
      const file = new Blob([
        `BILL AURA ERP - PAYSLIP\nEmployee: ${employee.name}\nDesignation: ${employee.designation?.name || 'Staff'}\nBasic: ${basicSalary}\nGross: ${grossSalary}\nNet Salary: ${netSalary}`
      ], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `Payslip_${employee.employeeCode || 'EMP'}_${periodType}.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <Modal title={`Payroll Generation Wizard: ${employee.name}`} isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          {[
            { num: 1, label: 'Payroll Period' },
            { num: 2, label: 'Salary Preview' },
            { num: 3, label: 'Generate & Action' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= s.num ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs font-semibold ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Select Payroll Period */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="font-bold text-sm">Step 1: Select Payroll Period</h3>
            
            <div className="grid grid-cols-3 gap-3">
              {['Weekly', '15 Days', 'Monthly', 'Quarterly', 'Financial Year', 'Custom Range'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPeriodType(type)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    periodType === type ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" 
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={() => setStep(2)}>Next: Preview Salary <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* Step 2: Salary Preview */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="font-bold text-sm">Step 2: Salary Computation & Attendance Preview</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/20 rounded-xl border border-border">
                <span className="text-xs text-muted-foreground uppercase font-bold">Attendance Days</span>
                <p className="text-lg font-bold text-foreground">22 / 24 Days</p>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border">
                <span className="text-xs text-muted-foreground uppercase font-bold">Overtime Hours</span>
                <p className="text-lg font-bold text-foreground">12.5 Hrs</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                <span className="text-xs text-green-700 uppercase font-bold">Calculated Net</span>
                <p className="text-lg font-bold text-green-700">{formatCurrency(netSalary)}</p>
              </div>
            </div>

            <div className="border border-border rounded-xl p-4 bg-background space-y-3 text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-semibold">Basic Salary</span>
                <span className="font-mono">{formatCurrency(basicSalary)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-semibold">Allowances & HRA</span>
                <span className="font-mono">{formatCurrency(allowances)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-semibold">Overtime Pay</span>
                <span className="font-mono">{formatCurrency(overtime)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 text-red-600">
                <span className="font-semibold">Deductions (PF / Tax)</span>
                <span className="font-mono">-{formatCurrency(deductions)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                <span>Total Payable Net Salary</span>
                <span className="font-mono text-green-600">{formatCurrency(netSalary)}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Computing...' : 'Generate Payslip'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Action */}
        {step === 3 && (
          <div className="space-y-6 text-center animate-in fade-in duration-300 py-2">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Payslip Generated Successfully!</h3>
              <p className="text-xs text-muted-foreground mt-1">Period: {startDate} to {endDate} ({periodType})</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="flex items-center justify-center gap-2" onClick={() => handleAction('Download PDF')}>
                <Download className="w-4 h-4 text-blue-500" /> Download PDF
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2" onClick={() => handleAction('Email Payslip')}>
                <Mail className="w-4 h-4 text-violet-500" /> Email Employee
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2" onClick={() => handleAction('Print')}>
                <Printer className="w-4 h-4" /> Print Payslip
              </Button>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => { setStep(1); onClose(); }}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
