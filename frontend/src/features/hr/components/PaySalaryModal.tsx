import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePaySalarySlip } from '../hooks/useHr';
import { Button } from '@/shared/components/ui/Button';
import { SearchableSelect } from '@/shared/components/ui';
import { apiClient, ensureArray } from '@/core/api/apiClient';

interface Props {
  onClose: () => void;
  salarySlipId: string;
}

export const PaySalaryModal: React.FC<Props> = ({ onClose, salarySlipId }) => {
  const { register, handleSubmit, setError, setValue, watch } = useForm();
  const paySlip = usePaySalarySlip(setError);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    // Fetch bank accounts for selection
    apiClient.get('/finance/bank/accounts')
      .then((res) => setBankAccounts(ensureArray(res)))
      .finally(() => setLoadingAccounts(false));
  }, []);

  const onSubmit = (data: any) => {
    paySlip.mutate(
      {
        id: salarySlipId,
        data: {
          bankAccountId: data.bankAccountId,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-md bg-surface p-6">
        <h2 className="mb-4 text-xl font-semibold">Pay Salary Slip</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Pay From (Bank Account) *</label>
            <SearchableSelect
              value={watch('bankAccountId') || ''}
              onChange={(val) => setValue('bankAccountId', val, { shouldValidate: true })}
              options={bankAccounts}
              mapOption={(acc) => ({
                value: acc.id,
                label: acc.name,
                subLabel: acc.currentBalance !== undefined ? `Balance: ₹${Number(acc.currentBalance).toLocaleString('en-IN')}` : undefined,
                searchKeywords: [acc.accountNumber].filter(Boolean),
              })}
              placeholder="Select Account"
              searchPlaceholder="Search bank accounts..."
              isLoading={loadingAccounts}
              clearable
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={paySlip.isPending}>
              {paySlip.isPending ? 'Processing...' : 'Pay Salary'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
