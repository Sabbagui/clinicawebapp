import apiClient from '../client';
import type { AppointmentFormData } from '@/lib/validation/appointment-schema';

// Types matching backend API response
export interface AppointmentAPI {
  id: string;
  patientId: string;
  patient: { id: string; name: string; phone: string };
  doctorId: string;
  doctor: { id: string; name: string };
  scheduledDate: string;
  duration: number;
  status: string;
  type: string;
  notes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient: { id: string; name: string; phone: string };
  doctorId: string;
  doctor: { id: string; name: string };
  scheduledDate: Date;
  duration: number;
  status: string;
  type: string;
  notes?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function transformAPIToAppointment(api: AppointmentAPI): Appointment {
  return {
    ...api,
    scheduledDate: new Date(api.scheduledDate),
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  };
}

function transformFormToAPI(form: AppointmentFormData) {
  return {
    patientId: form.patientId,
    doctorId: form.doctorId,
    scheduledDate: `${form.date}T${form.time}:00.000Z`,
    duration: form.duration,
    type: form.type,
    notes: form.notes || undefined,
  };
}

export const getAppointments = async (
  startDate: string,
  endDate: string,
  doctorId?: string,
): Promise<Appointment[]> => {
  const params = new URLSearchParams({ startDate, endDate });
  if (doctorId) params.append('doctorId', doctorId);
  const response = await apiClient.get<AppointmentAPI[]>(
    `/api/appointments?${params.toString()}`,
  );
  return response.data.map(transformAPIToAppointment);
};

export const getAppointment = async (id: string): Promise<Appointment> => {
  const response = await apiClient.get<AppointmentAPI>(`/api/appointments/${id}`);
  return transformAPIToAppointment(response.data);
};

export const createAppointment = async (
  data: AppointmentFormData,
): Promise<Appointment> => {
  const payload = transformFormToAPI(data);
  const response = await apiClient.post<AppointmentAPI>('/api/appointments', payload);
  return transformAPIToAppointment(response.data);
};

export const updateAppointment = async (
  id: string,
  data: AppointmentFormData,
): Promise<Appointment> => {
  const payload = transformFormToAPI(data);
  const response = await apiClient.patch<AppointmentAPI>(
    `/api/appointments/${id}`,
    payload,
  );
  return transformAPIToAppointment(response.data);
};

export const updateAppointmentStatus = async (
  id: string,
  status: string,
): Promise<Appointment> => {
  const response = await apiClient.patch<AppointmentAPI>(
    `/api/appointments/${id}/status`,
    { status },
  );
  return transformAPIToAppointment(response.data);
};
