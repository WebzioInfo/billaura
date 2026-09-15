import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { User, Briefcase, Building, Clock, DollarSign, Shield, FileText, Phone } from 'lucide-react';

interface EditEmployeeWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  initialData: any;
}

export const EditEmployeeWorkspace: React.FC<EditEmployeeWorkspaceProps> = ({ isOpen, onClose, employeeId, initialData }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState<any>({});
  const [bankDetails, setBankDetails] = useState<any>({});
  const [emergencyDetails, setEmergencyDetails] = useState<any>({});

  // Fetch Master Data
  const { data: departmentsData } = useQuery<any>({
    queryKey: ['hr-departments'],
    queryFn: () => apiClient.get('/hr-masters/departments').catch(() => ({ data: [] })),
    enabled: isOpen,
  });

  const { data: designationsData } = useQuery<any>({
    queryKey: ['hr-designations'],
    queryFn: () => apiClient.get('/hr-masters/designations').catch(() => ({ data: [] })),
    enabled: isOpen,
  });

  const { data: shiftsData } = useQuery<any>({
    queryKey: ['hr-shifts'],
    queryFn: () => apiClient.get('/hr-masters/shifts').catch(() => ({ data: [] })),
    enabled: isOpen,
  });

  const { data: employmentTypesData } = useQuery<any>({
    queryKey: ['hr-employment-types'],
    queryFn: () => apiClient.get('/hr-masters/employment-types').catch(() => ({ data: [] })),
    enabled: isOpen,
  });

  const { data: employeesData } = useQuery<any>({
    queryKey: ['hr-employees-list'],
    queryFn: () => apiClient.get('/hr/employees').catch(() => ({ data: [] })),
    enabled: isOpen,
  });

  const departments = Array.isArray(departmentsData?.data) ? departmentsData.data : (departmentsData?.data?.items || departmentsData || []);
  const designations = Array.isArray(designationsData?.data) ? designationsData.data : (designationsData?.data?.items || designationsData || []);
  const shifts = Array.isArray(shiftsData?.data) ? shiftsData.data : (shiftsData?.data?.items || shiftsData || []);
  const employmentTypes = Array.isArray(employmentTypesData?.data) ? employmentTypesData.data : (employmentTypesData?.data?.items || employmentTypesData || []);
  const allEmployees = Array.isArray(employeesData?.data) ? employeesData.data : (employeesData?.data?.items || employeesData || []);

  useEffect(() => {
    if (initialData && isOpen) {
      const nameParts = (initialData.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const bank = typeof initialData.bankDetails === 'object' && initialData.bankDetails !== null 
        ? initialData.bankDetails 
        : {};

      const emergency = typeof initialData.emergencyDetails === 'object' && initialData.emergencyDetails !== null
        ? initialData.emergencyDetails
        : {};

      setFormData({
        firstName,
        lastName,
        name: initialData.name || '',
        employeeCode: initialData.employeeCode || '',
        email: initialData.email || '',
        mobile: initialData.mobile || '',
        gender: initialData.gender || '',
        dateOfBirth: initialData.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : '',
        joiningDate: initialData.joiningDate ? initialData.joiningDate.split('T')[0] : '',
        address: initialData.address || '',
        status: initialData.status || (initialData.isActive === false ? 'INACTIVE' : 'ACTIVE'),
        departmentId: initialData.departmentId || '',
        designationId: initialData.designationId || '',
        shiftId: initialData.shiftId || '',
        employmentTypeId: initialData.employmentTypeId || '',
        reportingManagerId: initialData.reportingManagerId || '',
        branchId: initialData.branchId || '',
        salaryType: initialData.salaryType || 'MONTHLY',
        basicSalary: initialData.basicSalary || 0,
        aadhaarNumber: initialData.aadhaarNumber || '',
        panNumber: initialData.panNumber || '',
      });

      setBankDetails({
        accountHolderName: bank.accountHolderName || initialData.name || '',
        bankName: bank.bankName || '',
        accountNumber: bank.accountNumber || '',
        ifsc: bank.ifsc || '',
        branchName: bank.branchName || bank.branch || '',
        accountType: bank.accountType || 'SAVINGS',
      });

      setEmergencyDetails({
        contactName: emergency.contactName || '',
        relationship: emergency.relationship || '',
        phone: emergency.phone || '',
        alternatePhone: emergency.alternatePhone || '',
      });
    }
  }, [initialData, isOpen]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        name: `${values.firstName || ''} ${values.lastName || ''}`.trim() || values.name,
        basicSalary: Number(values.basicSalary) || 0,
        bankDetails: bankDetails,
        allowances: {
          emergencyDetails: emergencyDetails,
        },
      };

      const res = await apiClient.patch(`/hr/employees/${employeeId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      notification.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr-employees-list'] });
      onClose();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to update employee');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBankDetails((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleEmergencyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmergencyDetails((prev: any) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'department', label: 'Department & Designation', icon: Building },
    { id: 'shift', label: 'Shift & Attendance', icon: Clock },
    { id: 'salary', label: 'Salary Structure', icon: DollarSign },
    { id: 'bank', label: 'Bank Details', icon: Shield },
    { id: 'documents', label: 'Documents & Verification', icon: FileText },
    { id: 'emergency', label: 'Emergency Contacts', icon: Phone },
  ];

  return (
    <Modal title={`Edit Employee: ${initialData?.name || 'Unknown'}`} isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="flex h-[72vh]">
        {/* Sidebar */}
        <div className="w-1/4 border-r border-border pr-4 overflow-y-auto">
          <nav className="flex flex-col gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-accent text-white shadow-sm' 
                      : 'hover:bg-muted/15 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="w-3/4 pl-6 overflow-y-auto">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. PERSONAL INFORMATION */}
            {activeTab === 'personal' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Personal Information</h3>
                  <p className="text-xs text-muted-foreground">Manage personal contact and identity details.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">First Name *</label>
                    <Input name="firstName" value={formData.firstName || ''} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last Name</label>
                    <Input name="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                    <Input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mobile Phone</label>
                    <Input name="mobile" value={formData.mobile || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Gender</label>
                    <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date of Birth</label>
                    <Input type="date" name="dateOfBirth" value={formData.dateOfBirth || ''} onChange={handleInputChange} />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Residential Address</label>
                    <textarea 
                      name="address" 
                      rows={2}
                      value={formData.address || ''} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. EMPLOYMENT DETAILS */}
            {activeTab === 'employment' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Employment Details</h3>
                  <p className="text-xs text-muted-foreground">Manage organization code, status, and reporting lines.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employee Code *</label>
                    <Input name="employeeCode" value={formData.employeeCode || ''} onChange={handleInputChange} required />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Joining Date</label>
                    <Input type="date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employment Status *</label>
                    <select 
                      name="status" 
                      value={formData.status || 'ACTIVE'} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employment Type</label>
                    <select 
                      name="employmentTypeId" 
                      value={formData.employmentTypeId || ''} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Select Employment Type...</option>
                      {employmentTypes.map((et: any) => (
                        <option key={et.id} value={et.id}>{et.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reporting Manager</label>
                    <select 
                      name="reportingManagerId" 
                      value={formData.reportingManagerId || ''} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">None (Top Level / Executive)</option>
                      {allEmployees.filter((e: any) => e.id !== employeeId).map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DEPARTMENT & DESIGNATION */}
            {activeTab === 'department' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Department & Designation</h3>
                  <p className="text-xs text-muted-foreground">Assign department, job title, and operational unit.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Department</label>
                    <select 
                      name="departmentId" 
                      value={formData.departmentId || ''} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Select Department...</option>
                      {departments.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Designation / Title</label>
                    <select 
                      name="designationId" 
                      value={formData.designationId || ''} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Select Designation...</option>
                      {designations.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SHIFT & ATTENDANCE */}
            {activeTab === 'shift' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Shift & Attendance Schedule</h3>
                  <p className="text-xs text-muted-foreground">Configure work hours and default shift timing.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="col-span-2">
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Assigned Work Shift</label>
                    <select 
                      name="shiftId" 
                      value={formData.shiftId || ''} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Select Work Shift...</option>
                      {shifts.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime || '09:00'} - {s.endTime || '18:00'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SALARY STRUCTURE */}
            {activeTab === 'salary' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Salary & Payroll Configuration</h3>
                  <p className="text-xs text-muted-foreground">Specify wage structure and base compensation amount.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Salary Payment Frequency</label>
                    <select 
                      name="salaryType" 
                      value={formData.salaryType || 'MONTHLY'} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="MONTHLY">Monthly Fixed</option>
                      <option value="DAILY">Daily Wage</option>
                      <option value="HOURLY">Hourly Basis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Base Amount (₹)</label>
                    <Input 
                      type="number" 
                      name="basicSalary" 
                      value={formData.basicSalary || 0} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. BANK DETAILS */}
            {activeTab === 'bank' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Bank Account Information</h3>
                  <p className="text-xs text-muted-foreground">Account details used for payroll processing and direct deposits.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Account Holder Name</label>
                    <Input name="accountHolderName" value={bankDetails.accountHolderName || ''} onChange={handleBankChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bank Name</label>
                    <Input name="bankName" value={bankDetails.bankName || ''} onChange={handleBankChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Account Number</label>
                    <Input name="accountNumber" value={bankDetails.accountNumber || ''} onChange={handleBankChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">IFSC Code</label>
                    <Input name="ifsc" value={bankDetails.ifsc || ''} onChange={handleBankChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Branch Name</label>
                    <Input name="branchName" value={bankDetails.branchName || ''} onChange={handleBankChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Account Type</label>
                    <select name="accountType" value={bankDetails.accountType || 'SAVINGS'} onChange={handleBankChange} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent">
                      <option value="SAVINGS">Savings Account</option>
                      <option value="CURRENT">Current Account</option>
                      <option value="SALARY">Salary Account</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 7. DOCUMENTS & VERIFICATION */}
            {activeTab === 'documents' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Documents & Identity Proofs</h3>
                  <p className="text-xs text-muted-foreground">National identity codes and legal verification documents.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Aadhaar Card Number</label>
                    <Input name="aadhaarNumber" value={formData.aadhaarNumber || ''} onChange={handleInputChange} placeholder="XXXX-XXXX-XXXX" />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">PAN Card Number</label>
                    <Input name="panNumber" value={formData.panNumber || ''} onChange={handleInputChange} placeholder="ABCDE1234F" />
                  </div>
                </div>
              </div>
            )}

            {/* 8. EMERGENCY CONTACTS */}
            {activeTab === 'emergency' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-base text-foreground">Emergency Contacts</h3>
                  <p className="text-xs text-muted-foreground">Primary emergency contact person in case of urgent notice.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Contact Name</label>
                    <Input name="contactName" value={emergencyDetails.contactName || ''} onChange={handleEmergencyChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Relationship</label>
                    <Input name="relationship" value={emergencyDetails.relationship || ''} onChange={handleEmergencyChange} placeholder="e.g. Spouse / Parent / Sibling" />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Primary Phone Number</label>
                    <Input name="phone" value={emergencyDetails.phone || ''} onChange={handleEmergencyChange} />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground uppercase tracking-wider mb-1">Alternate Phone Number</label>
                    <Input name="alternatePhone" value={emergencyDetails.alternatePhone || ''} onChange={handleEmergencyChange} />
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" form="edit-employee-form" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};
