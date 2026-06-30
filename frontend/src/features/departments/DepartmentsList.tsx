import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  Building, Users, Landmark, Search, Plus, Trash2, 
  Loader2, RefreshCw, Briefcase, Award, Calendar, CheckSquare, FileText 
} from 'lucide-react';
import api from '../../services/api';

// --- SCHEMAS ---
const departmentSchema = z.object({
  name: z.string().min(2, 'Department name is too short'),
  description: z.string().optional(),
});

const designationSchema = z.object({
  name: z.string().min(2, 'Designation name is too short'),
  description: z.string().optional(),
});

const employeeSchema = z.object({
  employeeCode: z.string().min(2, 'Employee Code is too short'),
  name: z.string().min(2, 'Name is too short'),
  mobile: z.string().optional(),
  email: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  basicSalary: z.number(),
});

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  date: z.string().nonempty('Select date'),
  type: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY']),
  notes: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;
type DesignationFormValues = z.infer<typeof designationSchema>;
type EmployeeFormValues = z.infer<typeof employeeSchema>;
type AttendanceFormValues = z.infer<typeof attendanceSchema>;

// --- TYPES ---
interface Department {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Designation {
  id: string;
  name: string;
  description?: string;
}

interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email?: string;
  mobile?: string;
  basicSalary: number;
  department?: Department;
  designation?: Designation;
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  type: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
  notes?: string;
  employee: Employee;
}

export const DepartmentsList = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'departments' | 'designations' | 'attendance' | 'payroll'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lists
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Forms hooks
  const departmentForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', description: '' }
  });

  const designationForm = useForm<DesignationFormValues>({
    resolver: zodResolver(designationSchema),
    defaultValues: { name: '', description: '' }
  });

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeCode: '',
      name: '',
      mobile: '',
      email: '',
      departmentId: '',
      designationId: '',
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, desRes] = await Promise.all([
        api.get<any>('/departments'),
        api.get<any>('/designations'),
      ]);
      setDepartments(Array.isArray(deptRes) ? deptRes : (deptRes?.data || []));
      setDesignations(Array.isArray(desRes) ? desRes : (desRes?.data || []));

      const empRes = await api.get<any>('/employees');
      setEmployees(Array.isArray(empRes) ? empRes : (empRes?.data || []));

      if (activeTab === 'attendance' || activeTab === 'payroll') {
        const attRes = await api.get<any>('/attendances');
        setAttendances(Array.isArray(attRes) ? attRes : (attRes?.data || []));
      }
    } catch (err) {
      toast.error('Failed to load HR details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleDepartmentSubmit = async (values: DepartmentFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/departments', values);
      toast.success('Department created successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDesignationSubmit = async (values: DesignationFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/designations', values);
      toast.success('Designation created successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeSubmit = async (values: EmployeeFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/employees', values);
      toast.success('Employee registered successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttendanceSubmit = async (values: AttendanceFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/attendances', values);
      toast.success('Attendance check-in logged');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Logging failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunPayroll = async (emp: Employee) => {
    if (!window.confirm(`Disburse monthly salary payout of ${formatCurrency(Number(emp.basicSalary))} for ${emp.name}?`)) return;
    
    setIsSubmitting(true);
    try {
      // Mock post double-entry entry directly:
      // Debit: Salary overheads, Credit: Bank account
      // Find cash/bank and salary accounts
      const accountsRes = await api.get<any>('/accounts');
      const accountsList = accountsRes?.data?.items || accountsRes?.items || [];
      
      const salaryAcc = accountsList.find((a: any) => a.name.toLowerCase().includes('salary') || a.name.toLowerCase().includes('overhead'));
      const bankAcc = accountsList.find((a: any) => a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('cash'));

      if (!salaryAcc || !bankAcc) {
        toast.error('Ledger setup missing. Run initial Accounting page to seed Chart of Accounts.');
        setIsSubmitting(false);
        return;
      }

      await api.post('/journal-entries', {
        date: new Date().toISOString().split('T')[0],
        reference: `PAYROLL-${emp.employeeCode}`,
        description: `Monthly salary payout disburse for ${emp.name}`,
        lines: [
          { accountId: salaryAcc.id, debit: Number(emp.basicSalary), credit: 0 },
          { accountId: bankAcc.id, debit: 0, credit: Number(emp.basicSalary) },
        ],
      });

      toast.success(`Payslip generated. ${formatCurrency(Number(emp.basicSalary))} posted to ledger.`);
    } catch (err) {
      toast.error('Payroll run transaction error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      const endpoint = 
        activeTab === 'employees' ? '/employees' :
        activeTab === 'departments' ? '/departments' : '/designations';
      
      await api.delete(`${endpoint}/${id}`);
      toast.success('Item deleted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 text-left p-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="w-6 h-6 text-accent" />
            Human Capital & Payroll Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maintain departments directory, designation boards, employee files, check-in logs, and salary ledger disbursements.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab !== 'payroll' && (
            <button
              onClick={() => {
                departmentForm.reset();
                designationForm.reset();
                employeeForm.reset();
                attendanceForm.reset();
                setIsModalOpen(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'employees' ? 'Register Employee' : 
               activeTab === 'departments' ? 'Add Department' : 
               activeTab === 'designations' ? 'Add Designation' : 'Record Attendance'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-border gap-1">
        <button
          onClick={() => { setActiveTab('employees'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'employees' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Employees Directory
        </button>
        <button
          onClick={() => { setActiveTab('departments'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'departments' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Departments
        </button>
        <button
          onClick={() => { setActiveTab('designations'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'designations' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Designations
        </button>
        <button
          onClick={() => { setActiveTab('attendance'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'attendance' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Attendance Logs
        </button>
        <button
          onClick={() => { setActiveTab('payroll'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'payroll' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Payroll Disbursals
        </button>
      </div>

      {/* Search Input Filter */}
      {activeTab === 'employees' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Main Grid Panels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border h-32 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'employees' ? (
        employees.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Employees Registered</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())).map((emp) => (
              <div key={emp.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground">Code: <span className="font-semibold text-foreground">{emp.employeeCode}</span></p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Department: <span className="text-foreground font-semibold">{emp.department?.name || 'N/A'}</span></p>
                    <p>Designation: <span className="text-foreground font-semibold">{emp.designation?.name || 'N/A'}</span></p>
                    <p>Basic Salary: <span className="text-foreground font-bold">{formatCurrency(Number(emp.basicSalary))}</span></p>
                    {emp.email && <p>Email: <span className="text-foreground">{emp.email}</span></p>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleDelete(emp.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'departments' ? (
        departments.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Departments Defined</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div key={dept.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Building className="w-4 h-4 text-accent" />
                    {dept.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{dept.description || 'No description provided'}</p>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleDelete(dept.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'designations' ? (
        designations.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Designations Defined</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designations.map((des) => (
              <div key={des.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-accent" />
                    {des.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{des.description || 'No description provided'}</p>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleDelete(des.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'attendance' ? (
        attendances.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Attendance Logs Recorded</h3>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Status type</th>
                  <th className="py-4 px-6">Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((att) => (
                  <tr key={att.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
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
          </div>
        )
      ) : (
        // Payroll tab
        employees.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No active employees to generate payroll</h3>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Monthly Basic Salary</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-foreground">
                      {emp.name}
                      <p className="text-[10px] text-muted-foreground font-normal">{emp.employeeCode}</p>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-foreground">{formatCurrency(Number(emp.basicSalary))}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleRunPayroll(emp)}
                        disabled={isSubmitting}
                        className="bg-accent text-white hover:bg-opacity-90 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        Disburse Salary
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">
                {activeTab === 'employees' ? 'Register Employee' : 
                 activeTab === 'departments' ? 'Add Department' : 
                 activeTab === 'designations' ? 'Add Designation' : 'Record Attendance'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            {activeTab === 'employees' ? (
              <form onSubmit={employeeForm.handleSubmit(handleEmployeeSubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employee Code *</label>
                    <input type="text" {...employeeForm.register('employeeCode')} placeholder="e.g. EMP-001" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Name *</label>
                    <input type="text" {...employeeForm.register('name')} placeholder="e.g. Rahul Sharma" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
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
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Department</label>
                    <select {...employeeForm.register('departmentId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                      <option value="">Select...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Designation</label>
                    <select {...employeeForm.register('designationId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                      <option value="">Select...</option>
                      {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Basic Monthly Salary *</label>
                    <input type="number" {...employeeForm.register('basicSalary', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Register
                  </button>
                </div>
              </form>
            ) : activeTab === 'departments' ? (
              <form onSubmit={departmentForm.handleSubmit(handleDepartmentSubmit)} className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Department Name *</label>
                  <input type="text" {...departmentForm.register('name')} placeholder="e.g. Quality Assurance" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                  <textarea {...departmentForm.register('description')} placeholder="Operations details..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none" />
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Department
                  </button>
                </div>
              </form>
            ) : activeTab === 'designations' ? (
              <form onSubmit={designationForm.handleSubmit(handleDesignationSubmit)} className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Designation Title *</label>
                  <input type="text" {...designationForm.register('name')} placeholder="e.g. Senior Software Engineer" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                  <textarea {...designationForm.register('description')} placeholder="Role scope details..." rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none" />
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Designation
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={attendanceForm.handleSubmit(handleAttendanceSubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Select Employee *</label>
                    <select {...attendanceForm.register('employeeId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                      <option value="">Choose Employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date *</label>
                    <input type="date" {...attendanceForm.register('date')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Attendance Status *</label>
                    <select {...attendanceForm.register('type')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none">
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="HALF_DAY">Half Day</option>
                      <option value="LEAVE">On Leave</option>
                      <option value="HOLIDAY">Holiday</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Audit Notes</label>
                    <input type="text" {...attendanceForm.register('notes')} placeholder="Late check-in due to transport delay" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Record Attendance
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
