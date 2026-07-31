import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import notification from '@/core/services/NotificationService';
import { FileText, Download, Printer, CheckCircle, Calendar, FileSpreadsheet } from 'lucide-react';

interface AttendanceReportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

export const AttendanceReportWizard: React.FC<AttendanceReportWizardProps> = ({ isOpen, onClose, employee }) => {
  const [period, setPeriod] = useState('Month');
  const [format, setFormat] = useState('PDF');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  if (!isOpen || !employee) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setReportReady(true);
      notification.success(`Attendance report generated for ${employee.name}`);
    }, 1200);
  };

  const handleDownload = (type: string) => {
    notification.success(`Downloading Attendance Report (${type})...`);
    // Create dummy download file
    const element = document.createElement("a");
    const file = new Blob([
      `BILL AURA ERP - ATTENDANCE REPORT\nEmployee: ${employee.name} (${employee.employeeCode})\nPeriod: ${period}\nGenerated Date: ${new Date().toLocaleDateString()}\nStatus Summary:\nPresent: 22 Days | Absent: 0 Days | Leave: 2 Days | Weekly Off: 4 Days\nAttendance Rate: 95.6%`
    ], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Attendance_Report_${employee.employeeCode}_${period}.${type.toLowerCase() === 'pdf' ? 'pdf' : type.toLowerCase() === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Modal title={`Attendance Report Wizard: ${employee.name}`} isOpen={isOpen} onClose={onClose} maxWidth="lg">
      {!reportReady ? (
        <div className="space-y-5">
          <div className="bg-muted/30 p-4 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg text-accent">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Select Reporting Period</h4>
              <p className="text-xs text-muted-foreground">Preselected Employee: <span className="font-semibold text-foreground">{employee.name} ({employee.employeeCode})</span></p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['Today', 'Week', 'Month', 'Quarter', 'Year', 'Custom Range'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  period === p 
                    ? 'border-accent bg-accent/10 text-accent shadow-sm' 
                    : 'border-border bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'PDF', label: 'PDF Document', icon: FileText },
                { id: 'Excel', label: 'Excel Spreadsheet', icon: FileSpreadsheet },
                { id: 'CSV', label: 'Raw CSV', icon: Download },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      format === f.id ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="primary" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? 'Generating Report...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center py-4 bg-green-500/10 rounded-2xl border border-green-500/20">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <h3 className="font-bold text-lg text-foreground">Attendance Report Ready</h3>
            <p className="text-xs text-muted-foreground mt-1">Report generated for {period} ({employee.name})</p>
          </div>

          <div className="bg-muted/20 p-4 rounded-xl border border-border space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee:</span>
              <span className="font-semibold">{employee.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department:</span>
              <span className="font-semibold">{employee.department?.name || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attendance Summary:</span>
              <span className="font-semibold text-green-600">Present (95.6%)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => handleDownload('PDF')}>
              <FileText className="w-4 h-4 text-red-500" /> Download PDF
            </Button>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => handleDownload('Excel')}>
              <FileSpreadsheet className="w-4 h-4 text-green-600" /> Download Excel
            </Button>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => handleDownload('CSV')}>
              <Download className="w-4 h-4 text-blue-500" /> Download CSV
            </Button>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => { window.print(); }}>
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => { setReportReady(false); onClose(); }}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
