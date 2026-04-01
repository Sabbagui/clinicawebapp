import apiClient from '../client';
import { IncomeCategory } from '@/types';

export const listIncomeCategories = async (onlyActive = true): Promise<IncomeCategory[]> => {
  const response = await apiClient.get('/api/income-categories', {
    params: { onlyActive: onlyActive ? 'true' : 'false' },
  });
  return response.data;
};

export const createIncomeCategory = async (payload: { name: string; label: string }): Promise<IncomeCategory> => {
  const response = await apiClient.post('/api/income-categories', payload);
  return response.data;
};

export const updateIncomeCategory = async (
  id: string,
  payload: { label?: string; isActive?: boolean },
): Promise<IncomeCategory> => {
  const response = await apiClient.patch(`/api/income-categories/${id}`, payload);
  return response.data;
};

export const deleteIncomeCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/income-categories/${id}`);
};
