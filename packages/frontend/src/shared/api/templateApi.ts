import { apiClient } from './axios';

export const templateApi = {
  createTemplate: async (data: any) => {
    const response = await apiClient.post('/expense-templates', data);
    return response.data;
  },

  getTemplates: async (groupId?: string) => {
    const params = groupId ? { groupId } : undefined;
    const response = await apiClient.get('/expense-templates', { params });
    return response.data;
  },

  deleteTemplate: async (id: string) => {
    const response = await apiClient.delete(`/expense-templates/${id}`);
    return response.data;
  }
};
