import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: authData, isLoading, error } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/auth/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      queryClient.clear();
      window.location.href = '/auth/login';
    }
  };

  return {
    user: authData,
    company: authData?.company,
    isAuthenticated: !!authData,
    isLoading,
    error,
    logout,
  };
};
