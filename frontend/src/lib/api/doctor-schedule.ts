import apiClient from './client';

export interface DoctorScheduleEntry {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
}

export interface WeeklyScheduleEntryInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive?: boolean;
}

export interface UpdateDoctorScheduleDto {
  entries: WeeklyScheduleEntryInput[];
}

export interface CreateBlockedSlotDto {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface DoctorBlockedSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
  createdAt: string;
}

export async function getDoctorSchedule(
  doctorId: string,
): Promise<DoctorScheduleEntry[]> {
  const response = await apiClient.get<DoctorScheduleEntry[]>(
    `/api/doctor-schedule/${doctorId}`,
  );
  return response.data;
}

export async function updateDoctorSchedule(
  doctorId: string,
  schedule: UpdateDoctorScheduleDto,
): Promise<DoctorScheduleEntry[]> {
  const response = await apiClient.put<DoctorScheduleEntry[]>(
    `/api/doctor-schedule/${doctorId}`,
    schedule,
  );
  return response.data;
}

export async function createBlockedSlot(
  data: CreateBlockedSlotDto,
): Promise<DoctorBlockedSlot> {
  const response = await apiClient.post<DoctorBlockedSlot>(
    '/api/doctor-schedule/blocked-slots',
    data,
  );
  return response.data;
}

export async function deleteBlockedSlot(id: string): Promise<void> {
  await apiClient.delete(`/api/doctor-schedule/blocked-slots/${id}`);
}
