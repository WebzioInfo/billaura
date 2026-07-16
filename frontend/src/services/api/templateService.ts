import api from '../api';
import { DocumentTemplate } from '@/types/template';

export const templateService = {
  getTemplates: async (): Promise<DocumentTemplate[]> => {
    const response = await api.get('/document-templates');
    return response.data;
  },

  getTemplate: async (id: string): Promise<DocumentTemplate> => {
    const response = await api.get(`/document-templates/${id}`);
    return response.data;
  },

  getDefaultTemplate: async (type: string): Promise<DocumentTemplate> => {
    const response = await api.get(`/document-templates/default/${type}`);
    return response.data;
  },

  createTemplate: async (data: Partial<DocumentTemplate>): Promise<DocumentTemplate> => {
    const response = await api.post('/document-templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate> => {
    const response = await api.patch(`/document-templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/document-templates/${id}`);
  }
};
