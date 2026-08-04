import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Modal } from '../../../shared/components/ui/Modal';
import { AttendanceCalendar } from './AttendanceCalendar';
import { hrApi } from '../api/hr.api';
import { ExportService } from '@/core/services/ExportService';
import { ReportEngine } from '@/core/reporting/ReportEngine';
import notification from '@/core/services/NotificationService';
import { 
  Eye, Download, Printer, Calendar, User, Clock, Building2, 
  FileText, History, CheckCircle, Ban, Calculator, AlertCircle
} from 'lucide-react';

interface EnterprisePayrollDetailsModalProps {
  salarySlipId: string;
  onClose: () => void;
}

export const EnterprisePayrollDetailsModal: React.FC<EnterprisePayrollDetailsModalProps> = ({
  salarySlipId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [slip, setSlip] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'timeline' | 'history'>('details');

  useEffect(() => {
    fetchDetails();
  }, [salarySlipId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await hrApi.getSalarySlipById(salarySlipId);
      setSlip(data);

      if (data.employeeId && data.startDate && data.endDate) {
        const startStr = new Date(data.startDate).toISOString().split('T')[0];
        const endStr = new Date(data.endDate).toISOString().split('T')[0];
        const attLogs = await hrApi.getAttendances({
          employeeId: data.employeeId,
          startDate: startStr,
          endDate: endStr,
        });
        setAttendances(attLogs);
      }
    } catch (err: any) {
      notification.error(err.message || 'Failed to load payroll details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!slip) return;
    try {
      await ReportEngine.generatePayrollDossierPDF({
        items: [{ salarySlip: slip, attendances }],
        company: slip.company,
      });
      notification.success('Vector PDF Payroll Dossier downloaded');
    } catch (e: any) {
      notification.error('Failed to download Vector PDF');
    }
  };

  const handlePrint = async () => {
    if (!slip) return;
    try {
      await ReportEngine.generatePayrollDossierPDF({
        items: [{ salarySlip: slip, attendances }],
        company: slip.company,
      });
    } catch (e: any) {
      notification.error('Failed to generate print document');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const basic = Number(slip?.basicSalary) || 0;
  const allowances = Number(slip?.allowances) || 0;
  const bonus = Number(slip?.bonus) || 0;
  const incentives = Number(slip?.incentives) || 0;
  const grossSalary = basic + allowances + bonus + incentives;

  const deductions = Number(slip?.deductions) || 0;
  const netSalary = Number(slip?.netSalary) || 0;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Enterprise Payroll Details - ${slip?.employee?.name || 'Employee'}`}
      maxWidth="5xl"
    >
      {loading ? (
        <div className="py-12 text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-500">Fetching Enterprise Payroll & Attendance Details...</p>
        </div>
      ) : (
        <div className="space-y-6 py-2">
          {/* Top Actions & Sub-navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border">
            <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-md border text-xs">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1 font-semibold rounded ${activeTab === 'details' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Overview & Breakdown
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1 font-semibold rounded ${activeTab === 'attendance' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Attendance Calendar
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1 font-semibold rounded ${activeTab === 'timeline' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Attendance Timeline ({attendances.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 font-semibold rounded ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Audit & Version History ({slip?.auditLogs?.length || 0})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1.5" />
                Print
              </Button>
              <Button size="sm" onClick={handleDownloadPdf} className="bg-indigo-600 hover:bg-indigo-700">
                <Download className="w-4 h-4 mr-1.5" />
                Download Payslip
              </Button>
            </div>
          </div>

          {/* Employee Info Header */}
          <Card className="bg-gradient-to-r from-gray-50 to-indigo-50/20 border-indigo-100">
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Employee Name</span>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{slip?.employee?.name}</span>
                <span className="text-gray-500 block">{slip?.employee?.employeeCode}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Department & Designation</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{slip?.employee?.department?.name || 'General'}</span>
                <span className="text-gray-500 block">{slip?.employee?.designation?.name || 'Staff'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Payroll Period</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(slip?.startDate).toLocaleDateString()} - {new Date(slip?.endDate).toLocaleDateString()}
                </span>
                <span className="text-gray-500 block">Status: <Badge variant={slip?.status === 'PAID' ? 'success' : 'info'}>{slip?.status}</Badge></span>
              </div>
              <div>
                <span className="text-gray-500 block">Net Payable</span>
                <span className="font-mono text-lg font-bold text-indigo-600">{formatCurrency(netSalary)}</span>
              </div>
            </CardContent>
          </Card>

          {/* TAB 1: OVERVIEW & BREAKDOWN */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Attendance Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <span className="text-gray-500 block">Paid Days</span>
                  <span className="text-lg font-bold">{slip?.paidDays || 0}</span>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-lg border border-red-100">
                  <span className="block opacity-80">Absent / LOP Days</span>
                  <span className="text-lg font-bold">{slip?.absentDays || 0}</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-100">
                  <span className="block opacity-80">Gross Salary</span>
                  <span className="text-lg font-bold font-mono">{formatCurrency(grossSalary)}</span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100">
                  <span className="block opacity-80">Total Deductions</span>
                  <span className="text-lg font-bold font-mono">{formatCurrency(deductions)}</span>
                </div>
              </div>

              {/* Salary Breakdown Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings Table */}
                <Card>
                  <CardHeader className="py-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-b">
                    <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex justify-between">
                      <span>EARNINGS & ALLOWANCES</span>
                      <span className="font-mono">{formatCurrency(grossSalary)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <tbody className="divide-y">
                        <tr className="p-2">
                          <td className="p-2.5 font-medium">Basic Salary</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(basic)}</td>
                        </tr>
                        <tr className="p-2">
                          <td className="p-2.5 font-medium">Allowances</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(allowances)}</td>
                        </tr>
                        {bonus > 0 && (
                          <tr className="p-2">
                            <td className="p-2.5 font-medium">Bonus</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(bonus)}</td>
                          </tr>
                        )}
                        {incentives > 0 && (
                          <tr className="p-2">
                            <td className="p-2.5 font-medium">Incentives</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(incentives)}</td>
                          </tr>
                        )}
                        {slip?.earningsBreakdown && Object.entries(slip.earningsBreakdown).map(([k, v]: any) => {
                          if (['Basic Salary', 'Allowances', 'Bonus', 'Incentives'].includes(k)) return null;
                          return (
                            <tr key={k} className="p-2">
                              <td className="p-2.5 font-medium">{k}</td>
                              <td className="p-2.5 text-right font-mono">{formatCurrency(v?.amount || Number(v) || 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Deductions Table */}
                <Card>
                  <CardHeader className="py-2.5 bg-red-50/50 dark:bg-red-950/20 border-b">
                    <CardTitle className="text-xs font-semibold text-red-700 dark:text-red-300 flex justify-between">
                      <span>DEDUCTIONS & RECOVERIES</span>
                      <span className="font-mono">{formatCurrency(deductions)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <tbody className="divide-y">
                        <tr className="p-2">
                          <td className="p-2.5 font-medium">Total Deductions</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(deductions)}</td>
                        </tr>
                        {slip?.deductionsBreakdown && Object.entries(slip.deductionsBreakdown).map(([k, v]: any) => (
                          <tr key={k} className="p-2">
                            <td className="p-2.5 font-medium">{k}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(v?.amount || Number(v) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE CALENDAR */}
          {activeTab === 'attendance' && (
            <Card className="p-4">
              <AttendanceCalendar
                startDate={slip?.startDate}
                endDate={slip?.endDate}
                attendances={attendances}
                employeeName={slip?.employee?.name}
              />
            </Card>
          )}

          {/* TAB 3: ATTENDANCE TIMELINE */}
          {activeTab === 'timeline' && (
            <Card>
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-xs font-semibold">Attendance Log Timeline ({attendances.length} Records)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {attendances.length === 0 ? (
                  <p className="p-6 text-center text-xs text-gray-500">No raw attendance logs found in database for this period.</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 sticky top-0">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Check In</th>
                          <th className="p-2.5">Check Out</th>
                          <th className="p-2.5">Hours</th>
                          <th className="p-2.5">Overtime</th>
                          <th className="p-2.5">Late</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attendances.map((att: any) => (
                          <tr key={att.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-2.5 font-medium">{new Date(att.date).toLocaleDateString()}</td>
                            <td className="p-2.5">
                              <Badge variant={att.type === 'PRESENT' ? 'success' : att.type === 'ABSENT' ? 'danger' : 'warning'}>
                                {att.type || att.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-mono">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                            <td className="p-2.5 font-mono">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                            <td className="p-2.5">{att.workingHours || 0} hrs</td>
                            <td className="p-2.5 text-indigo-600 font-medium">{att.overtime || 0} hrs</td>
                            <td className="p-2.5 text-amber-600 font-medium">{att.lateBy || 0} mins</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 4: AUDIT & VERSION HISTORY */}
          {activeTab === 'history' && (
            <Card>
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-xs font-semibold">Audit & Version History ({slip?.auditLogs?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(!slip?.auditLogs || slip.auditLogs.length === 0) ? (
                  <p className="text-center text-xs text-gray-500 py-6">No audit log records recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {slip.auditLogs.map((log: any, idx: number) => {
                      let parsedReason = log.reason;
                      try {
                        if (log.reason && log.reason.startsWith('{')) {
                          const p = JSON.parse(log.reason);
                          parsedReason = p.userReason || parsedReason;
                        }
                      } catch (e) {}

                      return (
                        <div key={log.id || idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900 dark:text-gray-100">{log.action}</span>
                            <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400">By: {log.user?.name || log.userId || 'System'}</p>
                          <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Note:</span> {parsedReason}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );
};
