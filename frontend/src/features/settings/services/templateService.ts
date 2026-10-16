import { apiClient as api } from '../../../core/api/apiClient';
import { DocumentTemplate } from '@/features/settings/types/template';

export const templateService = {
  getTemplates: async (docType?: string): Promise<DocumentTemplate[]> => {
    const response = await api.get(`/document-templates${docType ? `?docType=${docType}` : ''}`);
    const data = response.data;
    return Array.isArray(data) ? data : data?.data || [];
  },

  getTemplate: async (id: string): Promise<DocumentTemplate> => {
    const response = await api.get(`/document-templates/${id}`);
    const data = response.data;
    return data?.data || data;
  },

  getDefaultTemplate: async (type: string): Promise<DocumentTemplate> => {
    const response = await api.get(`/document-templates/default/${type}`);
    const data = response.data;
    return data?.data || data;
  },

  createTemplate: async (data: Partial<DocumentTemplate>): Promise<DocumentTemplate> => {
    const response = await api.post('/document-templates', data);
    const resData = response.data;
    return resData?.data || resData;
  },

  updateTemplate: async (id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate> => {
    const response = await api.patch(`/document-templates/${id}`, data);
    const resData = response.data;
    return resData?.data || resData;
  },

  setDefault: async (id: string): Promise<DocumentTemplate> => {
    const response = await api.post(`/document-templates/${id}/set-default`);
    const resData = response.data;
    return resData?.data || resData;
  },

  cloneTemplate: async (id: string): Promise<DocumentTemplate> => {
    const response = await api.post(`/document-templates/${id}/clone`);
    const resData = response.data;
    return resData?.data || resData;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/document-templates/${id}`);
  },

  uploadLogo: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post('/document-templates/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.url;
  },
};

