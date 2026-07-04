import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useApiPaginatedList, PaginatedResult } from './useApiPaginatedList';

export function useApiList<T>(
  key: string[],
  url: string,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResult<T>, Error>, 'queryKey' | 'queryFn'>
) {
  const query = useApiPaginatedList<T>(key, url, params, options);
  
  return {
    ...query,
    data: query.data?.data || [],
    meta: query.data?.meta
  };
}
