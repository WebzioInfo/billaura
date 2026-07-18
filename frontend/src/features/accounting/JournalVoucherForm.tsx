import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import notification from '@/core/services/NotificationService';

import { apiClient as api } from '../../core/api/apiClient';
import { Button } from '../../shared/components/ui/Button';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { PageContainer } from '../../shared/components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';
import { LedgerLookup } from '../../shared/components/ui/LedgerLookup';
import { FormErrorDisplay } from '../../shared/components/ui';
import { useAsyncForm } from '../../shared/hooks/useAsyncForm';

const Label = (props: any) => <label className="block text-sm font-medium mb-1" {...props} />;

const journalSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  reference: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  lines: z.array(
    z.object({
      accountId: z.string().min(1, 'Account is required'),
      debit: z.number().optional(),
      credit: z.number().optional(),
    })
  ).min(2, 'At least 2 lines required (Double Entry)'),
}).refine(data => {
  const sumDebit = data.lines.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const sumCredit = data.lines.reduce((acc, curr) => acc + (curr.credit || 0), 0);
  return Math.abs(sumDebit - sumCredit) < 0.01 && sumDebit > 0;
}, {
  message: "Debits must equal Credits, and total must be > 0",
  path: ["lines"],
});

type JournalFormValues = z.infer<typeof journalSchema>;

export const JournalVoucherForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Ledger prefetching is removed in favor of LedgerLookup dynamic searching

  const form = useAsyncForm<JournalFormValues>(
    {
      resolver: zodResolver(journalSchema as any) as any,
      defaultValues: {
        date: new Date().toISOString().split('T')[0],
        reference: '',
        description: '',
        lines: [
          { accountId: '', debit: 0, credit: 0 },
          { accountId: '', debit: 0, credit: 0 },
        ],
      },
    },
    null,
    () => ({})
  );

  const {
    register,
    control,
    handleFormSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchLines = watch('lines');
  
  const totalDebit = watchLines.reduce((acc, curr) => acc + Number(curr.debit || 0), 0);
  const totalCredit = watchLines.reduce((acc, curr) => acc + Number(curr.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const mutation = useMutation({
    mutationFn: async (data: JournalFormValues) => {
      return api.post('/journal-entries', data);
    },
    onSuccess: () => {
      notification.success('Journal Voucher created successfully');
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigate('/journal-entries');
    },
    onError: (error: any) => {
      notification.error(error.response?.data?.message || 'Failed to create journal voucher');
    },
  });

  const onSubmit = (data: JournalFormValues) => {
    mutation.mutate(data);
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="New Journal Voucher"
        description="Record manual journal entries."
        backTo={{ label: 'Journal Entries', path: '/journal-entries' }}
      />

      <form onSubmit={handleFormSubmit(onSubmit as any)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Voucher Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Date"
                type="date"
                required
                {...register('date')}
              />
              <FormErrorDisplay error={errors.date} />
            </div>
            
            <div>
              <Input
                label="Reference No"
                {...register('reference')}
                placeholder="e.g. JV-001"
              />
              <FormErrorDisplay error={errors.reference} />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Description / Narration"
                required
                {...register('description')}
                placeholder="Enter narration for this journal entry"
              />
              <FormErrorDisplay error={errors.description} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journal Lines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 font-medium">Account</th>
                    <th className="text-right pb-3 font-medium w-48">Debit</th>
                    <th className="text-right pb-3 font-medium w-48">Credit</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="group">
                      <td className="py-3 pr-4">
                        <LedgerLookup
                          value={watchLines[index]?.accountId || ''}
                          onChange={(val) => setValue(`lines.${index}.accountId`, val)}
                          placeholder="Select Account..."
                          error={errors.lines?.[index]?.accountId?.message}
                        />
                      </td>
                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          step="0.01"
                          className="text-right"
                          {...register(`lines.${index}.debit`, { valueAsNumber: true })}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setValue(`lines.${index}.debit`, val);
                            if (val > 0) setValue(`lines.${index}.credit`, 0);
                          }}
                        />
                      </td>
                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          step="0.01"
                          className="text-right"
                          {...register(`lines.${index}.credit`, { valueAsNumber: true })}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setValue(`lines.${index}.credit`, val);
                            if (val > 0) setValue(`lines.${index}.debit`, 0);
                          }}
                        />
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => fields.length > 2 && remove(index)}
                          disabled={fields.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="py-4">Total</td>
                    <td className="py-4 px-2 text-right text-lg">{totalDebit.toFixed(2)}</td>
                    <td className="py-4 px-2 text-right text-lg">{totalCredit.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {errors.lines?.root && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <FormErrorDisplay error={errors.lines.root} />
              </div>
            )}
            {errors.lines?.message && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm font-medium text-red-500">{errors.lines.message}</p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ accountId: '', debit: 0, credit: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Line
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            size="lg" 
            disabled={isSubmitting || !isBalanced || totalDebit === 0}
          >
            {isSubmitting ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Journal Voucher</>}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
};
