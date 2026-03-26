import apiClient from '../client';
import type { Expense, ExpenseCategory, ExpenseExtractedData } from '@/types';

export interface CreateExpensePayload {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export interface ListExpensesParams {
  start?: string;
  end?: string;
  category?: ExpenseCategory;
  limit?: number;
  offset?: number;
}

export interface ListExpensesResponse {
  data: Expense[];
  total: number;
}

export const listExpenses = async (params: ListExpensesParams = {}): Promise<ListExpensesResponse> => {
  const response = await apiClient.get('/api/expenses', { params });
  return response.data;
};

export const getExpense = async (id: string): Promise<Expense> => {
  const response = await apiClient.get(`/api/expenses/${id}`);
  return response.data;
};

export const createExpense = async (payload: CreateExpensePayload): Promise<Expense> => {
  const response = await apiClient.post('/api/expenses', payload);
  return response.data;
};

export const updateExpense = async (id: string, payload: UpdateExpensePayload): Promise<Expense> => {
  const response = await apiClient.patch(`/api/expenses/${id}`, payload);
  return response.data;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/expenses/${id}`);
};

export const uploadExpenseReceipt = async (id: string, file: File): Promise<Expense> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(`/api/expenses/${id}/upload-receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteExpenseReceipt = async (id: string): Promise<Expense> => {
  const response = await apiClient.delete(`/api/expenses/${id}/receipt`);
  return response.data;
};

export const extractExpenseReceipt = async (file: File): Promise<ExpenseExtractedData> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/expenses/extract-receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data;
};
