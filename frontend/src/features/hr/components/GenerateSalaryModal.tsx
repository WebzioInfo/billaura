import React from 'react';
import { useForm } from 'react-hook-form';
import { useGenerateSalarySlip } from '../hooks/useHr';
import { Button } from '@/components/ui/Button';

interface Props {
  onClose: () => void;
  employees: any[];
}

export const GenerateSalaryModal: React.FC<Props> = ({ onClose, employees }) => {
  const { register, handleSubmit, setError } = useForm();
  const generateSlip = useGenerateSalarySlip(setError);

  const onSubmit = (data: any) => {
    generateSlip.mutate(
      {
        employeeId: data.employeeId,
        month: parseInt(data.month),
        year: parseInt(data.year),
        bonus: data.bonus ? parseFloat(data.bonus) : 0,
        deductions: data.deductions ? parseFloat(data.deductions) : 0,
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
        <h2 className="mb-4 text-xl font-semibold">Generate Salary Slip</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Employee</label>
            <select
              {...register('employeeId', { required: true })}
              className="mt-1 block w-full rounded-md border-border bg-background p-2"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium">Month (1-12)</label>
              <input
                type="number"
                min="1"
                max="12"
                {...register('month', { required: true })}
                className="mt-1 block w-full rounded-md border-border bg-background p-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium">Year</label>
              <input
                type="number"
                min="2000"
                {...register('year', { required: true })}
                className="mt-1 block w-full rounded-md border-border bg-background p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Bonus (Optional)</label>
            <input
              type="number"
              step="0.01"
              {...register('bonus')}
              className="mt-1 block w-full rounded-md border-border bg-background p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Deductions (Optional)</label>
            <input
              type="number"
              step="0.01"
              {...register('deductions')}
              className="mt-1 block w-full rounded-md border-border bg-background p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={generateSlip.isPending}>
              {generateSlip.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
