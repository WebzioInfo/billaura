import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';

export interface BankAccount {
  id: string;
  ledgerId: string;
  name: string;
  bankName?: string;
  accountNumber?: string;
  accountType?: 'SAVINGS' | 'CURRENT' | 'CASH';
  currentBalance?: number;
  isDefault?: boolean;
}

export function useBankAccounts() {
  const query = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      const res = await apiClient.get('/bank-accounts');
      const dataObj = res.data || res;
      // Since unwrap extracts data.data or items, handle all permutations safely
      const list = dataObj.items || dataObj.data?.items || dataObj.data || dataObj || [];
      return Array.isArray(list) ? (list as BankAccount[]) : [];
    }
  });

  return {
    ...query,
    bankAccounts: query.data || [],
    hasBankAccounts: (query.data || []).length > 0,
  };
}

