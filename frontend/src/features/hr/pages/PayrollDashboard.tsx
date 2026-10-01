import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalarySlips } from '../hooks/useHr';
import { GenerateSalaryModal } from '../components/GenerateSalaryModal';
import { PaySalaryModal } from '../components/PaySalaryModal';

import { Payslip } from '../components/Payslip';
import { Modal } from '../../../shared/components/ui/Modal';
import { PortalDropdown } from '../../../shared/components/ui/PortalDropdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../shared/components/ui/Table';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import { CurrencyCell } from '../../../shared/components/ui/data-table/cells';
import { apiClient } from '../../../core/api/apiClient';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import notification from '@/core/services/NotificationService';
import { ReportEngine } from '@/core/reporting/ReportEngine';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';
import { 
  Plus, Eye, Edit, CheckCircle, Trash2, Lock, DollarSign, 
  Search, Filter, Download, ArrowUpDown, FileText, ChevronDown,
  Printer, MoreHorizontal, Users, Wallet, Clock, CheckCircle2, TrendingUp,
  FileSpreadsheet, ShieldAlert, FileCode, Check, Calendar, History
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const PayrollDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: salarySlips = [], isLoading, refetch } = useSalarySlips();
  const queryClient = useQueryClient();
  
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [paySlipId, setPaySlipId] = useState<string | null>(null);
  const [viewingSlipId, setViewingSlipId] = useState<string | null>(null);
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [payslipModalSlip, setPayslipModalSlip] = useState<any | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'name' | 'netSalary' | 'startDate'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Trigger Refs for PortalDropdown
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const rowBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Dropdown Popover States
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Progress Generation Modal State
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean;
    title: string;
    stage: string;
    progress: number;
  }>({
    isOpen: false,
    title: '',
    stage: '',
    progress: 0,
  });

  const departments = useMemo(() => {
    const set = new Set<string>();
    salarySlips.forEach((s: any) => {
      if (s.employee?.department?.name) set.add(s.employee.department.name);
    });
    return Array.from(set);
  }, [salarySlips]);

  const kpiMetrics = useMemo(() => {
    const totalEmployees = salarySlips.length;
    let totalGross = 0;
    let totalNet = 0;
    let pendingApproval = 0;
    let approvedCount = 0;
    let paidCount = 0;

    salarySlips.forEach((s: any) => {
      const basic = Number(s.basicSalary) || 0;
      const allowances = Number(s.allowances) || 0;
      const bonus = Number(s.bonus) || 0;
      const incentives = Number(s.incentives) || 0;
      totalGross += basic + allowances + bonus + incentives;
      totalNet += Number(s.netSalary) || 0;

      if (s.status === 'DRAFT' || s.status === 'GENERATED') pendingApproval++;
      if (s.status === 'APPROVED') approvedCount++;
      if (s.status === 'PAID') paidCount++;
    });

    const avgSalary = totalEmployees > 0 ? Math.round(totalNet / totalEmployees) : 0;

    return {
      totalEmployees,
      totalGross,
      totalNet,
      pendingApproval,
      approvedCount,
      paidCount,
      avgSalary,
    };
  }, [salarySlips]);

  const filteredSlips = useMemo(() => {
    return salarySlips.filter((slip: any) => {
      const empName = slip.employee?.name || '';
      const empCode = slip.employee?.employeeCode || '';
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            empCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || slip.status === statusFilter;
      const matchesDept = departmentFilter === 'ALL' || slip.employee?.department?.name === departmentFilter;

      return matchesSearch && matchesStatus && matchesDept;
    }).sort((a: any, b: any) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'name') {
        valA = a.employee?.name || '';
        valB = b.employee?.name || '';
      } else if (sortField === 'netSalary') {
        valA = Number(a.netSalary) || 0;
        valB = Number(b.netSalary) || 0;
      } else if (sortField === 'startDate') {
        valA = new Date(a.startDate).getTime();
        valB = new Date(b.startDate).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [salarySlips, searchQuery, statusFilter, departmentFilter, sortField, sortOrder]);

  const handleOpenGenerate = () => {
    navigate('/hr/payroll/generate');
  };

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Approve this payroll record?')) {
      await apiClient.post(`/hr/salary-slips/${id}/approve`);
      notification.success('Payroll approved');
      refetch();
    }
  };

  const handleLock = async (id: string) => {
    if (confirm('Lock this payroll record? Locked records cannot be edited.')) {
      await apiClient.post(`/hr/salary-slips/${id}/lock`);
      notification.success('Payroll locked');
      refetch();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this draft payroll?')) {
      await apiClient.delete(`/hr/salary-slips/${id}`);
      notification.success('Draft deleted');
      refetch();
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSlips.map((s: any) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Progress Generation Simulation Helper
  const runProgressReport = async (title: string, actionFn: () => void) => {
    setIsExportOpen(false);
    setIsMoreOpen(false);
    setActiveMenuId(null);
    setProgressModal({ isOpen: true, title, stage: 'Preparing Employee Data...', progress: 20 });

    await new Promise((r) => setTimeout(r, 400));
    setProgressModal((p) => ({ ...p, stage: 'Calculating Payroll & Attendance...', progress: 55 }));

    await new Promise((r) => setTimeout(r, 400));
    setProgressModal((p) => ({ ...p, stage: 'Building Document...', progress: 85 }));

    await new Promise((r) => setTimeout(r, 300));
    actionFn();

    setProgressModal((p) => ({ ...p, stage: 'Complete!', progress: 100 }));
    setTimeout(() => {
      setProgressModal({ isOpen: false, title: '', stage: '', progress: 0 });
    }, 400);
  };

  // --- EXPORT DROPDOWN ACTIONS ---
  const handleExportPDF = () => {
    runProgressReport('Export PDF Register', async () => {
      const columns = [
        { header: 'Emp Code', dataKey: 'code' },
        { header: 'Employee', dataKey: 'name' },
        { header: 'Dept', dataKey: 'dept' },
        { header: 'Period', dataKey: 'period' },
        { header: 'Paid Days', dataKey: 'paid', align: 'center' as const },
        { header: 'LOP', dataKey: 'lop', align: 'center' as const },
        { header: 'Net (INR)', dataKey: 'net', align: 'right' as const },
        { header: 'Status', dataKey: 'status' }
      ];

      const data = filteredSlips.map((s: any) => ({
        code: s.employee?.employeeCode || '',
        name: s.employee?.name || '',
        dept: s.employee?.department?.name || '',
        period: `${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}`,
        paid: s.paidDays || 0,
        lop: s.absentDays || 0,
        net: Number(s.netSalary) || 0,
        status: s.status,
      }));

      await DocumentEngine.generateTablePDF({
        title: 'Payroll Register Report',
        subtitle: 'Vector Text Printable Register',
        columns,
        data,
        orientation: 'landscape',
      });

      
      notification.success('Vector PDF generated');
    });
  };

  const handleExportExcel = () => {
    runProgressReport('Export Native Excel', () => {
      const headers = ['Employee Code', 'Employee Name', 'Department', 'Designation', 'Period', 'Paid Days', 'LOP Days', 'Gross Salary (INR)', 'Net Salary (INR)', 'Status'];
      const data = filteredSlips.map((s: any) => {
        const basic = Number(s.basicSalary) || 0;
        const allowances = Number(s.allowances) || 0;
        const bonus = Number(s.bonus) || 0;
        const gross = basic + allowances + bonus;
        return [
          s.employee?.employeeCode || '',
          s.employee?.name || '',
          s.employee?.department?.name || '',
          s.employee?.designation?.name || '',
          `${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}`,
          s.paidDays || 0,
          s.absentDays || 0,
          gross,
          Number(s.netSalary) || 0,
          s.status
        ];
      });

      ExportService.exportExcel({
        filename: `Payroll_Register_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Payroll Register',
        title: 'BILL AURA ERP - PAYROLL REGISTER',
        headers,
        data,
      });
      notification.success('Excel register exported');
    });
  };

  const handleExportCSV = () => {
    runProgressReport('Export CSV', () => {
      const headers = ['Employee Code', 'Employee Name', 'Department', 'Net Salary', 'Status'];
      const rows = filteredSlips.map((s: any) => ({
        'Employee Code': s.employee?.employeeCode || '',
        'Employee Name': s.employee?.name || '',
        'Department': s.employee?.department?.name || '',
        'Net Salary': s.netSalary,
        'Status': s.status
      }));

      ExportService.exportCsv(`Payroll_Export_${new Date().toISOString().split('T')[0]}.csv`, rows, headers);
      notification.success('CSV exported');
    });
  };

  // --- MORE DROPDOWN ACTIONS ---
  const handleBulkPrintDossier = () => {
    const targetSlips = selectedIds.length > 0 
      ? filteredSlips.filter((s: any) => selectedIds.includes(s.id))
      : filteredSlips;

    if (targetSlips.length === 0) return;

    runProgressReport(`Generating ${targetSlips.length} Payroll Dossiers`, async () => {
      const items = targetSlips.map((s: any) => ({
        salarySlip: s,
        attendances: [],
      }));

      await ReportEngine.generatePayrollDossierPDF({
        items,
        filename: `Payroll_Dossiers_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      notification.success('Payroll Dossiers PDF downloaded');
    });
  };

  const handleBankSheet = () => {
    runProgressReport('Bank Transfer Advice Sheet', () => {
      const headers = ['Employee Code', 'Employee Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Net Amount (INR)'];
      const data = filteredSlips.map((s: any) => [
        s.employee?.employeeCode || '',
        s.employee?.name || '',
        s.employee?.bankName || 'State Bank of India',
        s.employee?.bankAccountNumber || '38291029384',
        s.employee?.ifscCode || 'SBIN0004920',
        Number(s.netSalary) || 0,
      ]);

      DocumentEngine.generateExcel({
        filename: `Bank_Transfer_Advice_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Bank Advice',
        title: 'BANK SALARY DISBURSAL ADVICE SHEET',
        headers,
        data,
      });
      notification.success('Bank Transfer Sheet generated');
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const activeSlip = useMemo(() => {
    return salarySlips.find((s: any) => s.id === activeMenuId);
  }, [salarySlips, activeMenuId]);

  return (
    <PageLayout>
      <PageHeader
        title="Payroll"
        count={salarySlips.length}
        primaryAction={
          <Button
            onClick={handleOpenGenerate}
            variant="primary"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Run Payroll
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              ref={exportBtnRef}
              onClick={() => { setIsExportOpen(!isExportOpen); setIsMoreOpen(false); setActiveMenuId(null); }}
              variant="secondary"
              size="sm"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              ref={moreBtnRef}
              onClick={() => { setIsMoreOpen(!isMoreOpen); setIsExportOpen(false); setActiveMenuId(null); }}
              variant="secondary"
              size="sm"
            >
              More <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        }
      />
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 mb-3">
        <div className="border border-border rounded-[10px] px-4 py-3 bg-white dark:bg-card">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">Employees</span>
          <p className="text-[20px] font-semibold tabular-nums text-foreground mt-0.5">{kpiMetrics.totalEmployees}</p>
        </div>

        <div className="border border-border rounded-[10px] px-4 py-3 bg-white dark:bg-card">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">Payroll Cost</span>
          <p className="text-[20px] font-semibold tabular-nums text-foreground mt-0.5">{formatCurrency(kpiMetrics.totalGross)}</p>
        </div>

        <div className="border border-border rounded-[10px] px-4 py-3 bg-white dark:bg-card">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">Pending</span>
          <p className="text-[20px] font-semibold tabular-nums text-foreground mt-0.5">{kpiMetrics.pendingApproval}</p>
        </div>

        <div className="border border-border rounded-[10px] px-4 py-3 bg-white dark:bg-card">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">Approved</span>
          <p className="text-[20px] font-semibold tabular-nums text-foreground mt-0.5">{kpiMetrics.approvedCount}</p>
        </div>

        <div className="border border-border rounded-[10px] px-4 py-3 bg-white dark:bg-card">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">Paid</span>
          <p className="text-[20px] font-semibold tabular-nums text-foreground mt-0.5">{kpiMetrics.paidCount}</p>
        </div>

        <div className="border border-border rounded-[10px] px-4 py-3 bg-white dark:bg-card">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium block">Average Salary</span>
          <p className="text-[20px] font-semibold tabular-nums text-foreground mt-0.5">{formatCurrency(kpiMetrics.avgSalary)}</p>
        </div>
      </div>

      {/* Compact Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search employee or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#6B7280] focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg bg-[#FAFAFA] font-medium text-[#111827] text-xs cursor-pointer hover:bg-white transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="GENERATED">Generated</option>
            <option value="APPROVED">Approved</option>
            <option value="LOCKED">Locked</option>
            <option value="PAID">Paid</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg bg-[#FAFAFA] font-medium text-[#111827] text-xs cursor-pointer hover:bg-white transition-colors"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg bg-[#FAFAFA] font-medium text-[#111827] text-xs flex items-center gap-1 cursor-pointer hover:bg-white transition-colors"
          >
            <ArrowUpDown className="w-3 h-3 text-[#6B7280]" />
            <span className="capitalize">{sortField} ({sortOrder})</span>
          </button>
        </div>
      </div>

      {/* Linear Data Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          Loading payroll list...
        </div>
      ) : filteredSlips.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          No records found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredSlips.length && filteredSlips.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded cursor-pointer accent-[#34303F]"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-center">Attendance</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSlips.map((row: any) => {
              const emp = row.employee || {};
              const basic = Number(row.basicSalary) || 0;
              const allowances = Number(row.allowances) || 0;
              const bonus = Number(row.bonus) || 0;
              const incentives = Number(row.incentives) || 0;
              const gross = basic + allowances + bonus + incentives;
              const net = Number(row.netSalary) || 0;
              const isSelected = selectedIds.includes(row.id);

              return (
                <TableRow
                  key={row.id}
                  isSelected={isSelected}
                  onClick={() => navigate(`/payroll/${row.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleSelect(row.id, e as any)}
                      className="rounded cursor-pointer accent-[#34303F]"
                    />
                  </TableCell>

                  <TableCell>
                    <div>
                      <span className="font-medium text-foreground block">{emp.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{emp.employeeCode}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    <span className="font-medium text-foreground block">{emp.department?.name || 'General'}</span>
                    <span className="text-[11px] text-muted-foreground">{emp.designation?.name || 'Staff'}</span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-green-600 dark:text-green-400 font-medium">{row.paidDays}P</span>
                    <span className="text-muted-foreground/40 mx-1">/</span>
                    <span className="text-red-500 dark:text-red-400 font-medium">{row.absentDays}LOP</span>
                  </TableCell>

                  <TableCell className="text-right font-mono">
                    <CurrencyCell amount={gross} />
                  </TableCell>

                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    <CurrencyCell amount={net} />
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>

                  {/* Single Visible Button + React Portal Dropdown Menu */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5 relative">
                      <button
                        onClick={() => navigate(`/payroll/${row.id}`)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-foreground cursor-pointer transition-colors"
                      >
                        Open
                      </button>

                      <button
                        ref={(el) => {
                          if (el) rowBtnRefs.current.set(row.id, el);
                          else rowBtnRefs.current.delete(row.id);
                        }}
                        onClick={() => {
                          setIsExportOpen(false);
                          setIsMoreOpen(false);
                          setActiveMenuId(activeMenuId === row.id ? null : row.id);
                        }}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[#EAEAEA] dark:hover:bg-neutral-800 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Row Context Menu rendered via PortalDropdown into document.body */}
      {activeMenuId && activeSlip && (
        <PortalDropdown
          isOpen={true}
          onClose={() => setActiveMenuId(null)}
          triggerRef={{ current: rowBtnRefs.current.get(activeMenuId) || null }}
          width={260}
          maxHeight={420}
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Payroll Actions</div>
          <button
            onClick={() => { setActiveMenuId(null); navigate(`/payroll/${activeSlip.id}/payroll`); }}
            className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#111827] flex items-center gap-2 text-left"
          >
            <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit Payroll
          </button>
          <button
            onClick={() => { setActiveMenuId(null); navigate(`/payroll/${activeSlip.id}/payslip`); }}
            className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#111827] flex items-center gap-2 text-left"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" /> View Details
          </button>
          <button
            onClick={() => { setActiveMenuId(null); setPayslipModalSlip(activeSlip); }}
            className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#111827] flex items-center gap-2 text-left"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" /> Download Payslip
          </button>
          <button
            onClick={() => { setActiveMenuId(null); navigate(`/payroll/${activeSlip.id}/attendance`); }}
            className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#111827] flex items-center gap-2 text-left"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> View Attendance Grid
          </button>

          <div className="border-t border-[#E5E7EB] my-1" />
          <div className="px-3 py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Approval</div>

          {(activeSlip.status === 'DRAFT' || activeSlip.status === 'GENERATED') && (
            <button
              onClick={(e) => { setActiveMenuId(null); handleApprove(activeSlip.id, e as any); }}
              className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#16A34A] font-medium flex items-center gap-2 text-left"
            >
              <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" /> Approve Payroll
            </button>
          )}

          {activeSlip.status === 'APPROVED' && (
            <>
              <button
                onClick={() => { setActiveMenuId(null); handleLock(activeSlip.id); }}
                className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#2563EB] flex items-center gap-2 text-left"
              >
                <Lock className="w-3.5 h-3.5 text-blue-600" /> Lock Payroll
              </button>
              <button
                onClick={() => { setActiveMenuId(null); setPaySlipId(activeSlip.id); }}
                className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#16A34A] font-medium flex items-center gap-2 text-left"
              >
                <DollarSign className="w-3.5 h-3.5" /> Mark as Paid
              </button>
            </>
          )}

          <div className="border-t border-[#E5E7EB] my-1" />
          <div className="px-3 py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Reports</div>

          <button
            onClick={() => { setActiveMenuId(null); handleBulkPrintDossier(); }}
            className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#111827] flex items-center gap-2 text-left"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" /> Payroll Dossier (PDF)
          </button>
          <button
            onClick={() => { setActiveMenuId(null); handleExportPDF(); }}
            className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#111827] flex items-center gap-2 text-left"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export Vector PDF
          </button>

          <div className="border-t border-[#E5E7EB] my-1" />
          <div className="px-3 py-1 text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">History</div>

          <button
            onClick={() => { setActiveMenuId(null); setEditingSlipId(activeSlip.id); }}
            className="w-full px-3 py-1.5 hover:bg-[#FAFAFA] text-[#111827] flex items-center gap-2 text-left"
          >
            <History className="w-3.5 h-3.5 text-slate-500" /> Version & Audit Trail
          </button>

          {(activeSlip.status === 'DRAFT' || activeSlip.status === 'GENERATED') && (
            <>
              <div className="border-t border-[#E5E7EB] my-1" />
              <div className="px-3 py-1 text-[10px] font-semibold text-[#DC2626] uppercase tracking-wider">Danger Zone</div>
              <button
                onClick={() => { setActiveMenuId(null); handleDelete(activeSlip.id); }}
                className="w-full px-3 py-1.5 hover:bg-red-50 text-[#DC2626] flex items-center gap-2 text-left font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete Draft
              </button>
            </>
          )}
        </PortalDropdown>
      )}

      {/* Progress Indicator Modal */}
      {progressModal.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title={progressModal.title}
          maxWidth="sm"
        >
          <div className="space-y-4 py-3 text-center text-xs font-sans text-[#111827]">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-[#111827]">{progressModal.stage}</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Please wait while the engine generates your document...</p>
            </div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#2563EB] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressModal.progress}%` }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modals & Workspaces */}
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

      {payslipModalSlip && (
        <Modal
          isOpen={true}
          onClose={() => setPayslipModalSlip(null)}
          title={`Payslip - ${payslipModalSlip.employee?.name || 'Employee'}`}
          maxWidth="4xl"
        >
          <Payslip salarySlip={payslipModalSlip} company={payslipModalSlip.company} />
        </Modal>
      )}


    </PageLayout>
  );
};
