import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient as api } from '../../core/api/apiClient';
import { ensureArray } from '../../core/api/apiClient';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function useApiPaginatedList<T>(
  key: any[],
  url: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResult<T>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResult<T>, Error>({
    queryKey: [...key, params],
    queryFn: async () => {
      // The backend ResponseEnvelopeInterceptor normalizes this to { success, data: [], meta }
      // or if it's missing, just a raw response.
      const res: any = await api.get(url, { params });
      
      const rawData = ensureArray<T>(res);
      let data: T[] = rawData;
      
      let meta: PaginationMeta = {
        page: params?.page || 1,
        limit: params?.limit || 25,
        total: rawData.length,
        totalPages: 1,
      };

      if (res && typeof res === 'object' && res.meta) {
        meta = { ...meta, ...res.meta };
      } else if (res?.data && typeof res.data === 'object' && res.data.meta) {
        meta = { ...meta, ...res.data.meta };
      }

      return { data, meta };
    },
    ...options,
  });
}

