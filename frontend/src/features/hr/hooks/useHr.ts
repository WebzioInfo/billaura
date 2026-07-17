import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi, GenerateSalarySlipDto, PaySalarySlipDto } from '../api/hr.api';
import { handleApiFormError } from '../../../utils/error-handler';
import { UseFormSetError } from 'react-hook-form';
import notification from '@/services/NotificationService';

export const useSalarySlips = () => {
  return useQuery({
    queryKey: ['hr', 'salary-slips'],
    queryFn: () => hrApi.getSalarySlips(),
  });
};

export const useGenerateSalarySlip = (setError?: UseFormSetError<any>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateSalarySlipDto) => hrApi.generateSalarySlip(data),
    onSuccess: () => {
      notification.success('Salary slip generated successfully');
      queryClient.invalidateQueries({ queryKey: ['hr', 'salary-slips'] });
    },
    onError: (error: any) => {
      if (setError) {
        handleApiFormError(error, setError);
      } else {
        notification.error(error.response?.data?.message || 'Failed to generate salary slip');
      }
    },
  });
};

export const usePaySalarySlip = (setError?: UseFormSetError<any>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaySalarySlipDto }) => hrApi.paySalarySlip(id, data),
    onSuccess: () => {
      notification.success('Salary slip marked as paid');
      queryClient.invalidateQueries({ queryKey: ['hr', 'salary-slips'] });
    },
    onError: (error: any) => {
      if (setError) {
        handleApiFormError(error, setError);
      } else {
        notification.error(error.response?.data?.message || 'Failed to pay salary slip');
      }
    },
  });
};
