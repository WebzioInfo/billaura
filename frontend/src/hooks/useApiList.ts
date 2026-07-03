import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';

export function useApiList<T>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T[], Error>({
    queryKey: key,
    queryFn: async () => {
      const res: any = await api.get(url);
      const items = res?.data?.data?.items || res?.data?.items || res?.data?.data || res?.data || res?.items || [];
      return Array.isArray(items) ? items : [];
    },
    ...options,
  });
}
