import { apiClient } from './api/apiClient';

export const authService = {
  login: async (credentials: any) => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/auth/login', credentials);
    return res.data;
  },
  register: async (data: any) => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/auth/register', data);
    return res.data;
  },
  verifyEmail: async (data: any) => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/auth/verify-email', data);
    return res.data;
  },
  logout: async () => {
    await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
  },
};

export const productService = {
  getProducts: async () => {
    const res = await apiClient.get<{ success: boolean; data: any }>('/products');
    return res.data;
  },
  createProduct: async (data: any) => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/products', data);
    return res.data;
  },
};

export default apiClient;
