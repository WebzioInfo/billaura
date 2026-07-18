import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePaySalarySlip } from '../hooks/useHr';
import { Button } from '@/shared/components/ui/Button';
import { apiClient } from '@/core/api/apiClient';

interface Props {
  onClose: () => void;
  salarySlipId: string;
}

export const PaySalaryModal: React.FC<Props> = ({ onClose, salarySlipId }) => {
  const { register, handleSubmit, setError } = useForm();
  const paySlip = usePaySalarySlip(setError);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch bank accounts for selection
    apiClient.get('/finance/bank/accounts').then((res) => setBankAccounts(res.data || []));
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
            <label className="block text-sm font-medium">Pay From (Bank Account)</label>
            <select
              {...register('bankAccountId', { required: true })}
              className="mt-1 block w-full rounded-md border-border bg-background p-2"
            >
              <option value="">Select Account</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} - Balance: {acc.currentBalance}
                </option>
              ))}
            </select>
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
