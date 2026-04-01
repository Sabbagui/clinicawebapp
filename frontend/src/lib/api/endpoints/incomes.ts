import apiClient from '../client';
import type { Income } from '@/types';

export interface CreateIncomePayload {
  description: string;
  amount: number;
  categoryId: string;
  date: string;
  notes?: string;
}

export type UpdateIncomePayload = Partial<CreateIncomePayload>;

export interface ListIncomesParams {
  start?: string;
  end?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

export interface ListIncomesResponse {
  data: Income[];
  total: number;
}

export const listIncomes = async (params: ListIncomesParams = {}): Promise<ListIncomesResponse> => {
  const response = await apiClient.get('/api/incomes', { params });
  return response.data;
};

export const getIncome = async (id: string): Promise<Income> => {
  const response = await apiClient.get(`/api/incomes/${id}`);
  return response.data;
};

export const createIncome = async (payload: CreateIncomePayload): Promise<Income> => {
  const response = await apiClient.post('/api/incomes', payload);
  return response.data;
};

export const updateIncome = async (id: string, payload: UpdateIncomePayload): Promise<Income> => {
  const response = await apiClient.patch(`/api/incomes/${id}`, payload);
  return response.data;
};

export const deleteIncome = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/incomes/${id}`);
};

export const uploadIncomeReceipt = async (id: string, file: File): Promise<Income> => {
  const formData = new FormData();
  formData.append('receipt', file);
  const response = await apiClient.post(`/api/incomes/${id}/upload-receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteIncomeReceipt = async (id: string): Promise<Income> => {
  const response = await apiClient.delete(`/api/incomes/${id}/receipt`);
  return response.data;
};
