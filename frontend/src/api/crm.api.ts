import api from '../services/api';
import { Customer, Lead, Contact, CrmActivity } from '../types';

export const CrmApi = {
  getCustomers: () => api.get<Customer[]>('/customers'),
  getCustomer: (id: string) => api.get<Customer>(`/customers/${id}`),
  createCustomer: (data: any) => api.post<Customer>('/customers', data),
  updateCustomer: (id: string, data: any) => api.put<Customer>(`/customers/${id}`, data),
  deleteCustomer: (id: string) => api.delete(`/customers/${id}`),

  getLeads: () => api.get<Lead[]>('/crm/leads'),
  createLead: (data: any) => api.post<Lead>('/crm/leads', data),
  updateLead: (id: string, data: any) => api.put<Lead>(`/crm/leads/${id}`, data),
  deleteLead: (id: string) => api.delete(`/crm/leads/${id}`),

  getContacts: () => api.get<Contact[]>('/crm/contacts'),
  createContact: (data: any) => api.post<Contact>('/crm/contacts', data),
  
  getActivities: () => api.get<CrmActivity[]>('/crm/activities'),
  createActivity: (data: any) => api.post<CrmActivity>('/crm/activities', data),
  updateActivityStatus: (id: string, isCompleted: boolean) => api.patch(`/crm/activities/${id}`, { isCompleted }),
};
