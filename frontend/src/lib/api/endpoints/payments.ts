import apiClient from '../client';
import type { Payment, PaymentMethod } from '@/types';

export interface CreatePaymentPayload {
  amount: number; // cents
  method: PaymentMethod;
  notes?: string;
}

export interface UpdatePaymentPayload {
  amount?: number; // cents
  method?: PaymentMethod;
  notes?: string;
}

export interface MarkPaymentPaidPayload {
  paidDate: string; // YYYY-MM-DD
}

export const getAppointmentPayment = async (
  appointmentId: string,
): Promise<Payment | null> => {
  const response = await apiClient.get<Payment | null>(
    `/api/appointments/${appointmentId}/payment`,
  );
  return response.data;
};

export const createAppointmentPayment = async (
  appointmentId: string,
  payload: CreatePaymentPayload,
): Promise<Payment> => {
  const response = await apiClient.post<Payment>(
    `/api/appointments/${appointmentId}/payment`,
    payload,
  );
  return response.data;
};

export const updatePayment = async (
  paymentId: string,
  payload: UpdatePaymentPayload,
): Promise<Payment> => {
  const response = await apiClient.patch<Payment>(`/api/payments/${paymentId}`, payload);
  return response.data;
};

export const markPaymentPaid = async (
  paymentId: string,
  payload: MarkPaymentPaidPayload,
): Promise<Payment> => {
  const response = await apiClient.post<Payment>(
    `/api/payments/${paymentId}/mark-paid`,
    payload,
  );
  return response.data;
};

export const cancelPayment = async (paymentId: string): Promise<Payment> => {
  const response = await apiClient.post<Payment>(`/api/payments/${paymentId}/cancel`);
  return response.data;
};

export const refundPayment = async (paymentId: string): Promise<Payment> => {
  const response = await apiClient.post<Payment>(`/api/payments/${paymentId}/refund`);
  return response.data;
};
