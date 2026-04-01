import apiClient from '../client';
import { ExpenseCategory } from '@/types';

export const listExpenseCategories = async (onlyActive = true): Promise<ExpenseCategory[]> => {
  const response = await apiClient.get('/api/expense-categories', {
    params: { onlyActive: onlyActive ? 'true' : 'false' },
  });
  return response.data;
};

export const createExpenseCategory = async (payload: { name: string; label: string }): Promise<ExpenseCategory> => {
  const response = await apiClient.post('/api/expense-categories', payload);
  return response.data;
};

export const updateExpenseCategory = async (id: string, payload: { label?: string; isActive?: boolean }): Promise<ExpenseCategory> => {
  const response = await apiClient.patch(`/api/expense-categories/${id}`, payload);
  return response.data;
};

export const deleteExpenseCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/expense-categories/${id}`);
};
