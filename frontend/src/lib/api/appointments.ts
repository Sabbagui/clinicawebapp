import apiClient from './client';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type AppointmentType =
  | 'FIRST_VISIT'
  | 'FOLLOW_UP'
  | 'EXAM'
  | 'PROCEDURE'
  | 'URGENT';

export interface AppointmentListFilters {
  doctorId?: string;
  patientId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  page?: number;
  limit?: number;
}

export interface AppointmentListItem {
  id: string;
  patientId: string;
  patient: { id: string; name: string; phone?: string };
  doctorId: string;
  doctor: { id: string; name: string };
  createdById?: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  notes?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetAppointmentsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: AppointmentListItem[];
}

export interface CreateAppointmentDto {
  patientId: string;
  doctorId: string;
  type: AppointmentType;
  date: string;
  startTime: string;
  notes?: string;
}

export interface UpdateAppointmentStatusDto {
  status: AppointmentStatus;
  cancelReason?: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

export interface DailyOverviewDoctorGroup {
  doctor: { id: string; name: string };
  counts: Record<AppointmentStatus, number>;
  appointments: AppointmentListItem[];
}

export interface DailyOverviewResponse {
  date: string;
  doctors: DailyOverviewDoctorGroup[];
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export async function getAppointments(
  filters: AppointmentListFilters,
): Promise<GetAppointmentsResponse> {
  const query = buildQuery({
    doctorId: filters.doctorId,
    patientId: filters.patientId,
    date: filters.date,
    startDate: filters.startDate,
    endDate: filters.endDate,
    status: filters.status,
    page: filters.page,
    limit: filters.limit,
  });
  const response = await apiClient.get<GetAppointmentsResponse>(
    `/api/appointments${query ? `?${query}` : ''}`,
  );
  return response.data;
}

export async function createAppointment(
  data: CreateAppointmentDto,
): Promise<AppointmentListItem> {
  const response = await apiClient.post<AppointmentListItem>('/api/appointments', data);
  return response.data;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  cancelReason?: string,
): Promise<AppointmentListItem> {
  const payload: UpdateAppointmentStatusDto = {
    status,
    ...(cancelReason ? { cancelReason } : {}),
  };
  const response = await apiClient.patch<AppointmentListItem>(
    `/api/appointments/${id}/status`,
    payload,
  );
  return response.data;
}

export async function getAvailableSlots(
  doctorId: string,
  date: string,
): Promise<AvailableSlot[]> {
  const query = buildQuery({ doctorId, date });
  const response = await apiClient.get<AvailableSlot[]>(
    `/api/appointments/available-slots?${query}`,
  );
  return response.data;
}

export async function getDailyOverview(
  date: string,
): Promise<DailyOverviewResponse> {
  const query = buildQuery({ date });
  const response = await apiClient.get<DailyOverviewResponse>(
    `/api/appointments/daily-overview?${query}`,
  );
  return response.data;
}

export async function rescheduleAppointment(
  id: string,
  date: string,
  startTime: string,
): Promise<AppointmentListItem> {
  const response = await apiClient.patch<AppointmentListItem>(
    `/api/appointments/${id}`,
    { date, startTime },
  );
  return response.data;
}
