import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AttendanceCalendar } from '../components/AttendanceCalendar';
import { Payslip } from '../components/Payslip';
import { Modal } from '../../../shared/components/ui/Modal';
import { hrApi } from '../api/hr.api';
import notification from '@/core/services/NotificationService';
import { ArrowLeft, Edit, Eye, Calendar, Lock, DollarSign, FileText, History, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const PayrollWorkspacePage: React.FC = () => {
  const { id: salarySlipId, tab: urlTab } = useParams<{ id: string; tab?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'payroll' | 'attendance' | 'audit' | 'payslip'>('payroll');

  // Sync tab with URL parameter
  useEffect(() => {
    if (urlTab === 'attendance' || urlTab === 'audit' || urlTab === 'payslip') {
      setActiveTab(urlTab);
    } else {
      setActiveTab('payroll');
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'payroll' | 'attendance' | 'audit' | 'payslip') => {
    setActiveTab(tab);
    navigate(`/payroll/${salarySlipId}/${tab}`);
  };

  const { data: slip = null, isLoading: loading, refetch } = useQuery({
    queryKey: ['hr', 'salary-slip', salarySlipId],
    queryFn: () => hrApi.getSalarySlipById(salarySlipId || ''),
    enabled: !!salarySlipId,
  });

  // Salary Component State initialized from loaded slip
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [incentive, setIncentive] = useState<number>(0);
  const [otAmount, setOtAmount] = useState<number>(0);
  
  const [fine, setFine] = useState<number>(0);
  const [advanceRecovery, setAdvanceRecovery] = useState<number>(0);
  const [loanRecovery, setLoanRecovery] = useState<number>(0);
  const [pf, setPf] = useState<number>(0);
  const [esi, setEsi] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (slip) {
      setBasicSalary(Number(slip.basicSalary) || 0);
      setAllowances(Number(slip.allowances) || 0);
      setBonus(Number(slip.bonus) || 0);
      setIncentive(Number(slip.incentives) || 0);
      
      const earnBreakdown = slip.earningsBreakdown || {};
      setOtAmount(Number(earnBreakdown['Overtime']?.amount) || 0);

      const dedBreakdown = slip.deductionsBreakdown || {};
      setFine(Number(dedBreakdown['Fine']?.amount) || 0);
      setAdvanceRecovery(Number(dedBreakdown['Advance Recovery']?.amount) || Number(slip.advances) || 0);
      setLoanRecovery(Number(dedBreakdown['Loan Recovery']?.amount) || 0);
      setPf(Number(dedBreakdown['PF']?.amount) || 0);
      setEsi(Number(dedBreakdown['ESI']?.amount) || 0);
      setTax(Number(dedBreakdown['Tax']?.amount) || 0);
      setOtherDeductions(Number(dedBreakdown['Other Deductions']?.amount) || 0);
    }
  }, [slip]);

  const { data: attendances = [] } = useQuery({
    queryKey: ['hr', 'attendances', slip?.employeeId, slip?.startDate, slip?.endDate],
    queryFn: () => {
      const startStr = new Date(slip.startDate).toISOString().split('T')[0];
      const endStr = new Date(slip.endDate).toISOString().split('T')[0];
      return hrApi.getAttendances({
        employeeId: slip.employeeId,
        startDate: startStr,
        endDate: endStr,
      });
    },
    enabled: !!slip?.employeeId && !!slip?.startDate && !!slip?.endDate,
  });

  const grossSalary = useMemo(() => {
    return (basicSalary || 0) + (allowances || 0) + (bonus || 0) + (incentive || 0) + (otAmount || 0);
  }, [basicSalary, allowances, bonus, incentive, otAmount]);

  const totalDeductions = useMemo(() => {
    return (fine || 0) + (advanceRecovery || 0) + (loanRecovery || 0) + (pf || 0) + (esi || 0) + (tax || 0) + (otherDeductions || 0);
  }, [fine, advanceRecovery, loanRecovery, pf, esi, tax, otherDeductions]);

  const netSalary = useMemo(() => {
    return Math.max(0, grossSalary - totalDeductions);
  }, [grossSalary, totalDeductions]);

  const handleSave = async (asDraft = false) => {
    try {
      setSaving(true);
      const payload = {
        basicSalary,
        allowances,
        bonus,
        incentives: incentive,
        otAmount,
        fine,
        advanceRecovery,
        loanRecovery,
        pf,
        esi,
        tax,
        otherDeductions,
        deductions: totalDeductions,
        reason: reason || (asDraft ? 'Saved draft state' : 'Manual payroll adjustment'),
        status: asDraft ? 'DRAFT' : 'GENERATED',
      };

      await hrApi.updateSalarySlip(salarySlipId || '', payload);
      notification.success(asDraft ? 'Draft saved' : 'Payroll updated');
      queryClient.invalidateQueries({ queryKey: ['hr', 'salary-slips'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'salary-slip', salarySlipId] });
      refetch();
    } catch (err: any) {
      notification.error(err.message || 'Failed to save edits');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-[#6B7280]">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 bg-white min-h-screen font-sans text-[#111827]">
      {/* Navigation Breadcrumb & Header */}
      <nav className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 h-[60px]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/payroll')}
            className="p-1 rounded-lg text-[#6B7280] hover:bg-[#FAFAFA] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span>Home</span>
              <span>&gt;</span>
              <span>HR</span>
              <span>&gt;</span>
              <span>Payroll</span>
              <span>&gt;</span>
              <span className="text-[#111827] font-medium">{slip?.employee?.name}</span>
            </div>
            <h2 className="text-sm font-semibold text-[#111827] mt-0.5">
              {slip?.employee?.name} ({slip?.employee?.employeeCode})
            </h2>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-[#FAFAFA] p-1 rounded-lg text-xs border border-[#E5E7EB]">
          <button
            onClick={() => handleTabChange('payroll')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'payroll' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Payroll
          </button>
          <button
            onClick={() => handleTabChange('attendance')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Attendance
          </button>
          <button
            onClick={() => handleTabChange('payslip')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'payslip' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Payslip
          </button>
          <button
            onClick={() => handleTabChange('audit')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-white text-[#111827] shadow-xs' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Audit History
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button 
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-[#111827] font-medium hover:bg-[#FAFAFA] transition-colors cursor-pointer"
          >
            Save Draft
          </button>
          <button 
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] text-white font-medium hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
          >
            Save Payroll
          </button>
        </div>
      </nav>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        {/* SECTION 1: EMPLOYEE MASTER PROFILE (3 cols) */}
        <section className="lg:col-span-3 space-y-4">
          <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-[#E5E7EB]">
              <div className="w-14 h-14 rounded-full bg-[#E5E7EB] text-[#111827] font-bold text-lg flex items-center justify-center mx-auto mb-2">
                {slip?.employee?.name?.[0] || 'E'}
              </div>
              <h3 className="font-semibold text-sm text-[#111827]">{slip?.employee?.name}</h3>
              <p className="text-[#6B7280] text-[11px] font-mono">{slip?.employee?.employeeCode}</p>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-medium text-[#6B7280] block">Department</span>
                <span className="font-medium text-[#111827]">{slip?.employee?.department?.name || 'General'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-[#6B7280] block">Designation</span>
                <span className="font-medium text-[#111827]">{slip?.employee?.designation?.name || 'Staff'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-[#6B7280] block">Joining Date</span>
                <span className="font-medium text-[#111827]">
                  {slip?.employee?.joiningDate ? new Date(slip.employee.joiningDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-[#6B7280] block">Bank Account</span>
                <span className="font-mono text-[#111827]">
                  {slip?.employee?.bankAccountNumber || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-[#6B7280] block">Statutory IDs</span>
                <span className="text-[11px] text-[#6B7280] block">PAN: {slip?.employee?.panNumber || 'N/A'}</span>
                <span className="text-[11px] text-[#6B7280] block">PF: {slip?.employee?.pfNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: TABS CONTAINER (6 cols) */}
        <section className="lg:col-span-6 space-y-6">
          {activeTab === 'payroll' && (
            <div className="space-y-4">
              {/* Earnings Breakdown */}
              <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-2 font-semibold text-[#111827]">
                  <span>Earnings Breakdown</span>
                  <span className="font-mono text-sm">{formatCurrency(grossSalary)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Basic Salary</label>
                    <input
                      type="number"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Allowances</label>
                    <input
                      type="number"
                      value={allowances}
                      onChange={(e) => setAllowances(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Bonus</label>
                    <input
                      type="number"
                      value={bonus}
                      onChange={(e) => setBonus(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Incentives</label>
                    <input
                      type="number"
                      value={incentive}
                      onChange={(e) => setIncentive(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-[#6B7280] block mb-1">Overtime Amount</label>
                    <input
                      type="number"
                      value={otAmount}
                      onChange={(e) => setOtAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-2 font-semibold text-[#111827]">
                  <span>Deductions & Recoveries</span>
                  <span className="font-mono text-sm text-[#DC2626]">-{formatCurrency(totalDeductions)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">PF (Provident Fund)</label>
                    <input
                      type="number"
                      value={pf}
                      onChange={(e) => setPf(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">ESI Insurance</label>
                    <input
                      type="number"
                      value={esi}
                      onChange={(e) => setEsi(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Income Tax / TDS</label>
                    <input
                      type="number"
                      value={tax}
                      onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Fine / LOP</label>
                    <input
                      type="number"
                      value={fine}
                      onChange={(e) => setFine(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Advance Recovery</label>
                    <input
                      type="number"
                      value={advanceRecovery}
                      onChange={(e) => setAdvanceRecovery(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6B7280] block mb-1">Loan Recovery</label>
                    <input
                      type="number"
                      value={loanRecovery}
                      onChange={(e) => setLoanRecovery(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Revision Note */}
              <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] text-xs">
                <label className="text-[11px] font-semibold text-[#111827] block mb-1">Revision Reason Note</label>
                <input
                  type="text"
                  placeholder="Describe reason for adjustment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#111827] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
              <AttendanceCalendar
                employeeId={slip?.employeeId}
                startDate={slip?.startDate}
                endDate={slip?.endDate}
                attendances={attendances}
                employeeName={slip?.employee?.name}
                employeeJoiningDate={slip?.employee?.joiningDate}
                employeeRelievingDate={slip?.employee?.relievingDate}
              />
            </div>
          )}

          {activeTab === 'payslip' && (
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
              <Payslip salarySlip={slip} company={slip?.company} />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-3 text-xs">
              <h3 className="font-semibold text-[#111827]">Audit Trail</h3>
              {(!slip?.auditLogs || slip.auditLogs.length === 0) ? (
                <p className="text-[#6B7280] text-center py-4">No audit logs recorded.</p>
              ) : (
                <div className="space-y-2">
                  {slip.auditLogs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="p-2.5 bg-white rounded-lg border border-[#E5E7EB] space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>{log.action}</span>
                        <span className="text-[10px] text-[#6B7280]">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[#6B7280]">By: {log.user?.name || log.userId || 'System'}</p>
                      <p className="text-[11px]">{log.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* SECTION 3: STICKY NET VARIANCE SUMMARY CARD (3 cols) */}
        <section className="lg:col-span-3 space-y-4">
          <div className="sticky top-20 p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-4 text-xs">
            <h3 className="font-semibold text-[#111827]">Adjustment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Contract Basic</span>
                <span className="font-mono text-[#111827]">{formatCurrency(slip?.basicSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Adjustment Gross</span>
                <span className="font-mono text-[#111827]">{formatCurrency(grossSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">LOP Days</span>
                <span className="font-mono text-[#DC2626] font-semibold">{slip?.absentDays || 0} Days</span>
              </div>
              <div className="flex justify-between border-t border-[#E5E7EB] pt-2">
                <span className="text-[#6B7280] font-medium">Current Net</span>
                <span className="font-mono font-bold text-[#2563EB]">{formatCurrency(netSalary)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
