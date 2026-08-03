import { apiClient } from '../../../core/api/apiClient';

export interface SalarySlip {
  id: string;
  companyId: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: string;
  allowances: string;
  bonus: string;
  deductions: string;
  netSalary: string;
  status: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'LOCKED' | 'PAID' | string;
  employee: any;
}

export interface GenerateSalarySlipDto {
  employeeId: string;
  month: number;
  year: number;
  bonus?: number;
  deductions?: number;
}

export interface PaySalarySlipDto {
  bankAccountId: string;
}

export const hrApi = {
  getSalarySlips: async (): Promise<SalarySlip[]> => {
    const res = await apiClient.get('/hr/salary-slips');
    return res.data || res;
  },
  getSalarySlipById: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/hr/salary-slips/${id}`);
    return res.data || res;
  },
  updateSalarySlip: async (id: string, data: any): Promise<any> => {
    const res = await apiClient.put(`/hr/salary-slips/${id}`, data);
    return res.data || res;
  },
  generateSalarySlip: async (data: GenerateSalarySlipDto): Promise<SalarySlip> => {
    const res = await apiClient.post('/hr/salary-slips/generate', data);
    return res.data || res;
  },
  paySalarySlip: async (id: string, data: PaySalarySlipDto): Promise<SalarySlip> => {
    const res = await apiClient.post(`/hr/salary-slips/${id}/pay`, data);
    return res.data || res;
  },
  getAttendances: async (params: { employeeId?: string; startDate?: string; endDate?: string }): Promise<any[]> => {
    const res = await apiClient.get('/hr/attendances', { params });
    const data = res.data || res;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },
  getEmployeeAttendanceCalendar: async (employeeId: string, params: { startDate: string; endDate: string }): Promise<any> => {
    const res = await apiClient.get(`/hr/employees/${employeeId}/attendance-calendar`, { params });
    return res.data || res;
  },
};
