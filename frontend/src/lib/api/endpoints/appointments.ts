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

// São Paulo is UTC-3 year-round (Brazil ended DST in 2019)
const SAO_PAULO_OFFSET_HOURS = 3;

function transformFormToAPI(form: AppointmentFormData) {
  const scheduledDate = clinicLocalToUtcIso(form.date, form.time);

  return {
    patientId: form.patientId,
    doctorId: form.doctorId,
    scheduledDate,
    duration: form.duration,
    type: form.type,
    notes: form.notes || undefined,
  };
}

function clinicLocalToUtcIso(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  // Add offset: local 14:00 BRT → 17:00 UTC (Date.UTC handles hour overflow)
  return new Date(
    Date.UTC(year, month - 1, day, hour + SAO_PAULO_OFFSET_HOURS, minute),
  ).toISOString();
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

// Dashboard day view types
export interface DayRowFlags {
  missingSoap: boolean;
  upcomingUnconfirmed: boolean;
  overdueInProgress: boolean;
}

export interface DayRow {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  type: string;
  notes: string | null;
  patient: { id: string; name: string; phone?: string; birthDate?: string };
  doctor: { id: string; name: string };
  flags: DayRowFlags;
}

export interface DayKpis {
  total: number;
  scheduled: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  noShow: number;
  cancelled: number;
  remaining: number;
  receivedCents: number;
  pendingCents: number;
}

export interface DayDashboardResponse {
  meta: { date: string; timezone: string };
  kpis: DayKpis;
  rows: DayRow[];
}

export const getDayDashboard = async (
  date: string,
  doctorId?: string,
  status?: string,
): Promise<DayDashboardResponse> => {
  const params = new URLSearchParams({ date });
  if (doctorId) params.set('doctorId', doctorId);
  if (status) params.set('status', status);
  const response = await apiClient.get<DayDashboardResponse>(
    `/api/appointments/day?${params.toString()}`,
  );
  return response.data;
};

export const confirmAppointment = async (id: string): Promise<Appointment> => {
  const response = await apiClient.post<AppointmentAPI>(`/api/appointments/${id}/confirm`);
  return transformAPIToAppointment(response.data);
};

export const noShowAppointment = async (id: string): Promise<Appointment> => {
  const response = await apiClient.post<AppointmentAPI>(`/api/appointments/${id}/no-show`);
  return transformAPIToAppointment(response.data);
};

export const cancelAppointment = async (id: string): Promise<Appointment> => {
  const response = await apiClient.post<AppointmentAPI>(`/api/appointments/${id}/cancel`);
  return transformAPIToAppointment(response.data);
};
