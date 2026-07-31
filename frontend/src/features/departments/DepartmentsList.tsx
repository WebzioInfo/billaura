import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/NotificationService';
import {
  Building, Search, Plus, Trash2, 
  Loader2, Briefcase, Users, Calendar, DollarSign, Settings,
  Eye, CheckCircle2, ChevronRight, UserCheck, Edit
} from 'lucide-react';
import { apiClient as api } from '../../core/api/apiClient';
import { dialog } from '@/core/services/DialogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteDialog, ConfirmDialog } from '../../shared/components/ui';
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { HRMastersManager } from '../hr/components/HRMastersManager';

// --- SCHEMAS ---
const employeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  name: z.string().min(2, 'Name is too short'),
  mobile: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.string().length(0)),
  departmentId: z.string().min(1, 'Department is required'),
  designationId: z.string().min(1, 'Designation is required'),
  shiftId: z.string().optional().nullable().or(z.string().length(0)),
  employmentTypeId: z.string().optional().nullable().or(z.string().length(0)),
  branchId: z.string().optional().nullable().or(z.string().length(0)),
  roleId: z.string().optional().nullable().or(z.string().length(0)),
  costCenterId: z.string().optional().nullable().or(z.string().length(0)),
  reportingManagerId: z.string().optional().nullable().or(z.string().length(0)),
  basicSalary: z.number().min(0, 'Basic salary must be non-negative'),
});

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().nonempty('Date is required'),
  type: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY']),
  notes: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;
type AttendanceFormValues = z.infer<typeof attendanceSchema>;

type HRTab = 'employees' | 'masters' | 'attendance' | 'payroll';

export const DepartmentsList = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Derive active tab from URL path or state
  const path = location.pathname;
  let activeTab: HRTab = 'employees';
  if (path.includes('/attendance')) activeTab = 'attendance';
  if (path.includes('/payroll')) activeTab = 'payroll';
  if (path.includes('/departments') || path.includes('/hr?tab=masters')) activeTab = 'masters';
  
  const setActiveTab = (tab: HRTab) => {
    if (tab === 'employees') navigate('/employees');
    else if (tab === 'attendance') navigate('/attendance');
    else if (tab === 'payroll') navigate('/payroll');
    else navigate('/departments');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [payrollTarget, setPayrollTarget] = useState<any>(null);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Forms hooks
  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeCode: '',
      name: '',
      mobile: '',
      email: '',
      departmentId: '',
      designationId: '',
      shiftId: '',
      employmentTypeId: '',
      branchId: '',
      roleId: '',
      costCenterId: '',
      reportingManagerId: '',
      basicSalary: 0,
    }
  });

  const attendanceForm = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'PRESENT',
      notes: '',
    }
  });

  // Main HR Query
  const { data: hrData, isLoading } = useQuery({
    queryKey: ['hr-administrative-hub', activeTab],
    queryFn: async () => {
      const [empRes, deptRes, shiftRes, typeRes, branchRes, roleRes, ccRes, bankRes] = await Promise.all([
        api.get<any>('/hr/employees'),
        api.get<any>('/hr-masters/departments'),
        api.get<any>('/hr-masters/shifts'),
        api.get<any>('/hr-masters/employment-types'),
        api.get<any>('/branches'),
        api.get<any>('/roles'),
        api.get<any>('/cost-centers'),
        api.get<any>('/bank-accounts'),
      ]);

      let attendances: any[] = [];
      let salarySlips: any[] = [];
      if (activeTab === 'attendance') {
        const attRes = await api.get<any>('/hr/attendances');
        attendances = Array.isArray(attRes) ? attRes : (attRes?.data || []);
      }
      if (activeTab === 'payroll') {
        const slipRes = await api.get<any>('/hr/salary-slips');
        salarySlips = Array.isArray(slipRes) ? slipRes : (slipRes?.data || []);
      }

      return {
        employees: Array.isArray(empRes) ? empRes : (empRes?.data || []),
        departments: Array.isArray(deptRes) ? deptRes : (deptRes?.data || []),
        shifts: Array.isArray(shiftRes) ? shiftRes : (shiftRes?.data || []),
        employmentTypes: Array.isArray(typeRes) ? typeRes : (typeRes?.data || []),
        branches: Array.isArray(branchRes) ? branchRes : (branchRes?.data || []),
        roles: Array.isArray(roleRes) ? roleRes : (roleRes?.data || []),
        costCenters: Array.isArray(ccRes) ? ccRes : (ccRes?.data?.items || ccRes?.items || []),
        bankAccounts: Array.isArray(bankRes) ? bankRes : (bankRes?.data || []),
        attendances,
        salarySlips,
      };
    }
  });

  const employees = hrData?.employees || [];
  const departments = hrData?.departments || [];
  const shifts = hrData?.shifts || [];
  const employmentTypes = hrData?.employmentTypes || [];
  const branches = hrData?.branches || [];
  const roles = hrData?.roles || [];
  const costCenters = hrData?.costCenters || [];
  const bankAccounts = hrData?.bankAccounts || [];
  const attendances = hrData?.attendances || [];
  const salarySlips = hrData?.salarySlips || [];

  // Mutations
  const createEmployeeMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) => api.post('/hr/employees', values),
    onSuccess: () => {
      notification.success('Employee registered successfully');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['hr-administrative-hub'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Registration failed');
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: EmployeeFormValues }) => api.put(`/hr/employees/${id}`, values),
    onSuccess: () => {
      notification.success('Employee profile updated successfully');
      setIsModalOpen(false);
      setEditingEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['hr-administrative-hub'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Update failed');
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/employees/${id}`),
    onSuccess: () => {
      notification.success('Employee record archived');
      queryClient.invalidateQueries({ queryKey: ['hr-administrative-hub'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Archiving failed');
    }
  });

  const recordAttendanceMutation = useMutation({
    mutationFn: (values: AttendanceFormValues) => api.post('/hr/attendances', values),
    onSuccess: () => {
      notification.success('Attendance log saved');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['hr-administrative-hub'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Logging failed');
    }
  });

  const runPayrollMutation = useMutation({
    mutationFn: ({ employeeId, bankAccountId }: { employeeId: string; bankAccountId: string }) => {
      // 1. Generate salary slip
      return api.post('/hr/salary-slips/generate', {
        employeeId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      }).then((res: any) => {
        // 2. Pay it immediately using the selected bank account
        const slip = res.data || res;
        return api.post(`/hr/salary-slips/${slip.id}/pay`, { bankAccountId });
      });
    },
    onSuccess: () => {
      notification.success('Monthly payroll disbursed and GL vouchers posted.');
      setPayrollTarget(null);
      queryClient.invalidateQueries({ queryKey: ['hr-administrative-hub'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Payroll processing failed');
    }
  });

  // Dynamic Designations loading based on Department
  const selectedDepartmentId = useWatch({
    control: employeeForm.control,
    name: 'departmentId',
  });

  const { data: designations = [], isLoading: desgsLoading } = useQuery({
    queryKey: ['designations', selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];
      const res = await api.get(`/hr-masters/designations?departmentId=${selectedDepartmentId}`);
      return res.data?.data || [];
    },
    enabled: !!selectedDepartmentId
  });

  const handleOpenCreateEmployee = () => {
    setEditingEmployee(null);
    employeeForm.reset({
      employeeCode: '',
      name: '',
      mobile: '',
      email: '',
      departmentId: '',
      designationId: '',
      shiftId: '',
      employmentTypeId: '',
      branchId: '',
      roleId: '',
      costCenterId: '',
      reportingManagerId: '',
      basicSalary: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: any) => {
    setEditingEmployee(emp);
    employeeForm.reset({
      employeeCode: emp.employeeCode || '',
      name: emp.name || '',
      mobile: emp.mobile || '',
      email: emp.email || '',
      departmentId: emp.departmentId || '',
      designationId: emp.designationId || '',
      shiftId: emp.shiftId || '',
      employmentTypeId: emp.employmentTypeId || '',
      branchId: emp.branchId || '',
      roleId: emp.roleId || '',
      costCenterId: emp.costCenterId || '',
      reportingManagerId: emp.reportingManagerId || '',
      basicSalary: Number(emp.basicSalary || 0),
    });
    setIsModalOpen(true);
  };

  const handleEmployeeSubmit = (values: EmployeeFormValues) => {
    // Sanitize optional empty strings to null for backend
    const sanitized: any = { ...values };
    ['shiftId', 'employmentTypeId', 'branchId', 'roleId', 'costCenterId', 'reportingManagerId', 'email', 'mobile'].forEach(field => {
      if (!sanitized[field]) sanitized[field] = null;
    });

    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, values: sanitized });
    } else {
      createEmployeeMutation.mutate(sanitized);
    }
  };

  const handleAttendanceSubmit = (values: AttendanceFormValues) => {
    recordAttendanceMutation.mutate(values);
  };

  const handleConfirmDisburse = () => {
    if (!payrollTarget || !selectedBankId) {
      notification.error('Please choose bank account for disbursement.');
      return;
    }
    runPayrollMutation.mutate({ employeeId: payrollTarget.id, bankAccountId: selectedBankId });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const filteredEmployees = employees.filter((e: any) => {
    const term = searchQuery.toLowerCase();
    return e.name.toLowerCase().includes(term) || e.employeeCode.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 text-left p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="w-6 h-6 text-accent" />
            Enterprise HRMS & Payroll Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standard SAP-grade workforce database, master registers, attendance auditing, and salary journal posting.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'employees' && (
            <Button onClick={handleOpenCreateEmployee} variant="primary" className="flex items-center gap-2 font-bold px-4">
              <Plus className="w-4 h-4" /> Register Employee
            </Button>
          )}
          {activeTab === 'attendance' && (
            <Button onClick={() => { attendanceForm.reset(); setIsModalOpen(true); }} variant="primary" className="flex items-center gap-2 font-bold px-4">
              <Plus className="w-4 h-4" /> Record Check-in
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-border gap-1">
        {[
          { id: 'employees', label: 'Employees Directory' },
          { id: 'masters', label: 'HR Configurations (Masters)' },
          { id: 'attendance', label: 'Attendance Logs' },
          { id: 'payroll', label: 'Payroll Engine' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as HRTab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Filter bar */}
      {activeTab === 'employees' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search employee registry..." 
            className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Loading Panels */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 py-12">
          <div className="h-32 bg-surface rounded-2xl animate-pulse" />
        </div>
      ) : activeTab === 'employees' ? (
        filteredEmployees.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No employees registered in the system.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp: any) => (
              <Card key={emp.id} className="p-6 border border-border hover:border-accent/40 transition-colors flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">Code: <span className="font-semibold text-foreground">{emp.employeeCode}</span></p>
                    </div>
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-[10px] font-bold rounded-full">{emp.status}</span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Department: <span className="text-foreground font-semibold">{emp.department?.name || 'Unassigned'}</span></p>
                    <p>Designation: <span className="text-foreground font-semibold">{emp.designation?.name || 'Unassigned'}</span></p>
                    <p>Employment Type: <span className="text-foreground font-semibold">{emp.employmentType?.name || 'Unassigned'}</span></p>
                    <p>Branch: <span className="text-foreground font-semibold">{emp.branch?.name || 'Head Office'}</span></p>
                    <p>Basic Salary: <span className="text-foreground font-bold">{formatCurrency(Number(emp.basicSalary))}</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleOpenEditEmployee(emp)} className="p-2 text-muted-foreground hover:text-accent rounded-lg hover:bg-accent/10 transition-colors cursor-pointer">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await dialog.confirmDelete(
                        'Archive Employee?',
                        `Are you sure you want to archive employee ${emp.name}?`
                      );
                      if (confirmed) {
                        deleteEmployeeMutation.mutate(emp.id);
                      }
                    }}
                    className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : activeTab === 'masters' ? (
        <HRMastersManager />
      ) : activeTab === 'attendance' ? (
        attendances.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No attendance records found.</Card>
        ) : (
          <Card className="overflow-hidden border border-border">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((att: any) => (
                  <tr key={att.id} className="border-b border-border/50 hover:bg-background/10 transition-colors">
                    <td className="py-4 px-6 font-bold text-foreground">{att.employee?.name}</td>
                    <td className="py-4 px-6 text-sm text-foreground">{att.date.split('T')[0]}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                        att.type === 'PRESENT' ? 'bg-green-500/10 text-green-500' :
                        att.type === 'ABSENT' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {att.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-sm">{att.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : (
        /* Payroll Tab */
        <div className="space-y-6">
          <Card className="p-6 bg-surface border border-border">
            <h3 className="font-bold text-lg mb-4">Run Monthly Payroll Payouts</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Select an employee below to process their salary slip and disburse salary to bank accounts.
            </p>
            {employees.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">No active employees found to disburse.</div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-4 px-6">Employee</th>
                      <th className="py-4 px-6">Department</th>
                      <th className="py-4 px-6">Branch</th>
                      <th className="py-4 px-6">Monthly Salary</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp: any) => {
                      const payslipPaid = salarySlips.some((s: any) => s.employeeId === emp.id && s.month === new Date().getMonth() + 1);
                      return (
                        <tr key={emp.id} className="border-b border-border/50 hover:bg-background/10 transition-colors">
                          <td className="py-4 px-6 font-bold text-foreground">
                            {emp.name}
                            <p className="text-[10px] text-muted-foreground font-mono font-normal mt-0.5">{emp.employeeCode}</p>
                          </td>
                          <td className="py-4 px-6 text-sm text-foreground">{emp.department?.name || 'Unassigned'}</td>
                          <td className="py-4 px-6 text-sm text-foreground">{emp.branch?.name || 'Head Office'}</td>
                          <td className="py-4 px-6 text-sm font-bold text-foreground">{formatCurrency(Number(emp.basicSalary))}</td>
                          <td className="py-4 px-6 text-right">
                            {payslipPaid ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold px-3 py-1 bg-green-500/10 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PAID (This Month)
                              </span>
                            ) : (
                              <Button
                                onClick={() => {
                                  setSelectedBankId(bankAccounts[0]?.id || '');
                                  setPayrollTarget(emp);
                                }}
                                variant="primary"
                                className="px-3 py-1.5 text-xs font-bold"
                              >
                                Disburse Salary
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Employee Dialog */}
      {isModalOpen && activeTab === 'employees' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-2xl z-10 overflow-hidden text-left">
            <div className="px-6 py-4 border-b border-border bg-background bg-opacity-35 flex justify-between items-center">
              <h2 className="font-bold text-lg text-foreground">
                {editingEmployee ? 'Update Employee Profile' : 'Register Employee'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={employeeForm.handleSubmit(handleEmployeeSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employee Code *</label>
                  <input type="text" {...employeeForm.register('employeeCode')} placeholder="e.g. EMP-101" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent" />
                  {employeeForm.formState.errors.employeeCode && (
                    <span className="text-xs text-red-500">{employeeForm.formState.errors.employeeCode.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Name *</label>
                  <input type="text" {...employeeForm.register('name')} placeholder="e.g. Rahul Sharma" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent" />
                  {employeeForm.formState.errors.name && (
                    <span className="text-xs text-red-500">{employeeForm.formState.errors.name.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mobile</label>
                  <input type="text" {...employeeForm.register('mobile')} placeholder="+91 9988..." className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</label>
                  <input type="email" {...employeeForm.register('email')} placeholder="rahul@company.com" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <SearchableSelect
                    label="Department *"
                    required
                    value={employeeForm.watch('departmentId')}
                    onChange={(val: string) => {
                      employeeForm.setValue('departmentId', val, { shouldValidate: true });
                      employeeForm.setValue('designationId', '');
                    }}
                    options={departments}
                    mapOption={(dept: any) => ({ label: dept.name, value: dept.id })}
                    placeholder="Search Department..."
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Designation *"
                    required
                    value={employeeForm.watch('designationId')}
                    onChange={(val: string) => employeeForm.setValue('designationId', val, { shouldValidate: true })}
                    options={designations}
                    mapOption={(d: any) => ({ label: d.name, value: d.id })}
                    placeholder={selectedDepartmentId ? "Search Designation..." : "Select Department First"}
                    disabled={!selectedDepartmentId || desgsLoading}
                  />
                  {employeeForm.formState.errors.designationId && (
                    <span className="text-xs text-red-500 mt-1 block">{employeeForm.formState.errors.designationId.message as string}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Work Shift</label>
                  <select {...employeeForm.register('shiftId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                    <option value="">Select Shift...</option>
                    {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employment Type</label>
                  <select {...employeeForm.register('employmentTypeId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                    <option value="">Select Type...</option>
                    {employmentTypes.map((et: any) => <option key={et.id} value={et.id}>{et.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Branch Location</label>
                  <select {...employeeForm.register('branchId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                    <option value="">Select Branch...</option>
                    {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">System Role</label>
                  <select {...employeeForm.register('roleId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                    <option value="">Select Role...</option>
                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">GL Cost Center</label>
                  <select {...employeeForm.register('costCenterId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                    <option value="">Select Cost Center...</option>
                    {costCenters.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reporting Manager</label>
                  <select {...employeeForm.register('reportingManagerId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                    <option value="">Select Manager...</option>
                    {employees.filter((emp: any) => emp.id !== editingEmployee?.id).map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Basic Monthly Salary (INR) *</label>
                  <input type="number" {...employeeForm.register('basicSalary', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent" />
                  {employeeForm.formState.errors.basicSalary && (
                    <span className="text-xs text-red-500">{employeeForm.formState.errors.basicSalary.message}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
                  {createEmployeeMutation.isPending || updateEmployeeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingEmployee ? 'Update Profile' : 'Register Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {isModalOpen && activeTab === 'attendance' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-md z-10 overflow-hidden text-left">
            <div className="px-6 py-4 border-b border-border bg-background bg-opacity-35 flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground">Record Attendance Check-in</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={attendanceForm.handleSubmit(handleAttendanceSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employee *</label>
                <select required {...attendanceForm.register('employeeId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                  <option value="">Select Employee...</option>
                  {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date *</label>
                <input type="date" required {...attendanceForm.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status Type *</label>
                <select required {...attendanceForm.register('type')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LEAVE">Leave</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Audit Notes</label>
                <input type="text" {...attendanceForm.register('notes')} placeholder="Late check-in details..." className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={recordAttendanceMutation.isPending}>
                  {recordAttendanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Check-in'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Confirmation Dialog */}
      {payrollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayrollTarget(null)} />
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-md z-10 overflow-hidden text-left">
            <div className="px-6 py-4 border-b border-border bg-background bg-opacity-35 flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground">Confirm Payroll Disbursement</h3>
              <button onClick={() => setPayrollTarget(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">
                You are disbursing monthly salary payout for <strong>{payrollTarget.name}</strong>.
              </p>
              <div className="p-4 bg-background rounded-xl border border-border space-y-1.5 text-xs">
                <p className="text-muted-foreground">Employee Code: <span className="text-foreground font-semibold font-mono">{payrollTarget.employeeCode}</span></p>
                <p className="text-muted-foreground">Department: <span className="text-foreground font-semibold">{payrollTarget.department?.name || 'Unassigned'}</span></p>
                <p className="text-muted-foreground">Net Payout: <span className="text-accent font-bold text-sm">{formatCurrency(Number(payrollTarget.basicSalary))}</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Disburse From Bank Account *</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
                >
                  <option value="">Select Bank Account...</option>
                  {bankAccounts.map((b: any) => <option key={b.id} value={b.id}>{b.name} (Bal: {formatCurrency(Number(b.currentBalance))})</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setPayrollTarget(null)}>Cancel</Button>
                <Button
                  onClick={handleConfirmDisburse}
                  variant="primary"
                  disabled={runPayrollMutation.isPending || !selectedBankId}
                >
                  {runPayrollMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post & Disburse'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
