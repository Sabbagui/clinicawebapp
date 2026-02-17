import apiClient from '../client';
import type { MedicalRecord } from '@/types';

// --- Encounter endpoints (on appointments) ---

export const startEncounter = async (appointmentId: string) => {
  const response = await apiClient.post(`/api/appointments/${appointmentId}/start`);
  return response.data;
};

export const completeAppointment = async (appointmentId: string) => {
  const response = await apiClient.post(`/api/appointments/${appointmentId}/complete`);
  return response.data;
};

export const getAppointmentMedicalRecord = async (
  appointmentId: string,
): Promise<MedicalRecord | null> => {
  const response = await apiClient.get(`/api/appointments/${appointmentId}/medical-record`);
  return response.data;
};

// --- Medical record CRUD ---

export interface CreateMedicalRecordPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface UpdateMedicalRecordPayload {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export const createMedicalRecord = async (
  payload: CreateMedicalRecordPayload,
): Promise<MedicalRecord> => {
  const response = await apiClient.post<MedicalRecord>('/api/medical-records', payload);
  return response.data;
};

export const updateMedicalRecord = async (
  id: string,
  payload: UpdateMedicalRecordPayload,
): Promise<MedicalRecord> => {
  const response = await apiClient.patch<MedicalRecord>(`/api/medical-records/${id}`, payload);
  return response.data;
};

export const finalizeMedicalRecord = async (id: string): Promise<MedicalRecord> => {
  const response = await apiClient.post<MedicalRecord>(`/api/medical-records/${id}/finalize`);
  return response.data;
};
