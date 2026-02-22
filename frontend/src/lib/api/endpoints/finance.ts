import apiClient from '../client';
import { PaymentMethod } from '@/types';

export interface FinanceSummaryParams {
  start: string;
  end: string;
  doctorId?: string;
  timezone?: string;
}

export interface FinanceReceivablesParams {
  start: string;
  end: string;
  doctorId?: string;
  method?: PaymentMethod;
  timezone?: string;
  limit?: number;
  offset?: number;
}

export interface FinanceReceivablesResponse {
  meta: {
    start: string;
    end: string;
    timezone: string;
    doctorId: string | null;
    method: PaymentMethod | null;
    limit: number;
    offset: number;
    total: number;
  };
  kpis: {
    pendingCents: number;
    pendingCount: number;
    buckets: {
      d0_7: { cents: number; count: number };
      d8_15: { cents: number; count: number };
      d16_30: { cents: number; count: number };
      d31p: { cents: number; count: number };
    };
  };
  rows: Array<{
    payment: {
      id: string;
      amount: number;
      method: PaymentMethod;
      status: 'PENDING';
      createdAt: string;
    };
    appointment: {
      id: string;
      startTime: string;
      status: string;
      type: string;
    };
    patient: { id: string; name: string; phone?: string };
    doctor: { id: string; name: string };
    ageDays: number;
    ageBucket: '0_7' | '8_15' | '16_30' | '31+';
  }>;
}

export interface FinanceSummary {
  meta: {
    start: string;
    end: string;
    timezone: string;
    doctorId: string | null;
  };
  kpis: {
    receivedCents: number;
    pendingCents: number;
    refundedCents: number;
    cancelledCents: number;
    paidCount: number;
    pendingCount: number;
    refundedCount: number;
    cancelledCount: number;
    noShowCount: number;
    cancelledApptCount: number;
  };
  series: {
    dailyReceived: Array<{ date: string; cents: number; count: number }>;
    dailyPending: Array<{ date: string; cents: number; count: number }>;
  };
  breakdowns: {
    byMethod: Array<{
      method: string;
      receivedCents: number;
      pendingCents: number;
      countPaid: number;
      countPending: number;
    }>;
    byDoctor: Array<{
      doctorId: string;
      doctorName: string;
      receivedCents: number;
      pendingCents: number;
      countPaid: number;
      countPending: number;
    }>;
  };
  topPending: Array<{
    appointmentId: string;
    startTime: string;
    patient: { id: string; name: string; phone?: string };
    doctor: { id: string; name: string };
    payment: { id: string; amount: number; method: string; status: string };
  }>;
}

export const getFinanceSummary = async (
  params: FinanceSummaryParams,
): Promise<FinanceSummary> => {
  const query = new URLSearchParams({
    start: params.start,
    end: params.end,
  });
  if (params.doctorId) query.set('doctorId', params.doctorId);
  if (params.timezone) query.set('timezone', params.timezone);

  const response = await apiClient.get<FinanceSummary>(
    `/api/finance/summary?${query.toString()}`,
  );
  return response.data;
};

export const getFinanceReceivables = async (
  params: FinanceReceivablesParams,
): Promise<FinanceReceivablesResponse> => {
  const query = new URLSearchParams({
    start: params.start,
    end: params.end,
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  });
  if (params.doctorId) query.set('doctorId', params.doctorId);
  if (params.method) query.set('method', params.method);
  if (params.timezone) query.set('timezone', params.timezone);

  const response = await apiClient.get<FinanceReceivablesResponse>(
    `/api/finance/receivables?${query.toString()}`,
  );
  return response.data;
};
