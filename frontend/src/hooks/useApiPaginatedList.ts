import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';

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
      
      let data: T[] = [];
      let meta: PaginationMeta = {
        page: params?.page || 1,
        limit: params?.limit || 25,
        total: 0,
        totalPages: 0,
      };

      if (res?.data && Array.isArray(res.data)) {
        data = res.data;
        if (res.meta) {
          meta = { ...meta, ...res.meta };
        } else {
          meta.total = data.length;
          meta.totalPages = 1;
        }
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data;
        if (res.data.meta) {
          meta = { ...meta, ...res.data.meta };
        }
      } else if (Array.isArray(res)) {
        data = res;
        meta.total = data.length;
        meta.totalPages = 1;
      }

      return { data, meta };
    },
    ...options,
  });
}
