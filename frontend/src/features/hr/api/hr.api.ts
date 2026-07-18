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
    return apiClient.get('/hr/salary-slips');
  },
  generateSalarySlip: async (data: GenerateSalarySlipDto): Promise<SalarySlip> => {
    return apiClient.post('/hr/salary-slips/generate', data);
  },
  paySalarySlip: async (id: string, data: PaySalarySlipDto): Promise<SalarySlip> => {
    return apiClient.post(`/hr/salary-slips/${id}/pay`, data);
  },
};
