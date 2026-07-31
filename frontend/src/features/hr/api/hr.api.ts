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
  status: 'GENERATED' | 'PAID';
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
  generateSalarySlip: async (data: GenerateSalarySlipDto): Promise<SalarySlip> => {
    const res = await apiClient.post('/hr/salary-slips/generate', data);
    return res.data || res;
  },
  paySalarySlip: async (id: string, data: PaySalarySlipDto): Promise<SalarySlip> => {
    const res = await apiClient.post(`/hr/salary-slips/${id}/pay`, data);
    return res.data || res;
  },
};
