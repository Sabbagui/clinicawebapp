import apiClient from '../client';

export interface Doctor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateStaffData {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  crm?: string;
  crmUf?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export interface DoctorProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  crm: string | null;
  crmUf: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  clinicPhone: string | null;
}

export const getUserById = async (id: string): Promise<DoctorProfile> => {
  const response = await apiClient.get<DoctorProfile>(`/api/users/${id}`);
  return response.data;
};

export const getDoctors = async (): Promise<Doctor[]> => {
  const response = await apiClient.get<Doctor[]>('/api/users?role=DOCTOR');
  return response.data;
};

export const getStaff = async (): Promise<StaffMember[]> => {
  const response = await apiClient.get<StaffMember[]>('/api/users');
  return response.data;
};

export const createStaffMember = async (
  data: CreateStaffData,
): Promise<StaffMember> => {
  const response = await apiClient.post<StaffMember>('/api/users', data);
  return response.data;
};

export const updateStaffMember = async (
  id: string,
  data: UpdateStaffData,
): Promise<StaffMember> => {
  const response = await apiClient.patch<StaffMember>(`/api/users/${id}`, data);
  return response.data;
};

export const resetStaffPassword = async (
  id: string,
  password: string,
): Promise<StaffMember> => {
  const response = await apiClient.patch<StaffMember>(
    `/api/users/${id}/password`,
    { password },
  );
  return response.data;
};

export const deleteStaffMember = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/users/${id}`);
};
