import apiClient from '../client';

export interface Doctor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const getDoctors = async (): Promise<Doctor[]> => {
  const response = await apiClient.get<Doctor[]>('/api/users?role=DOCTOR');
  return response.data;
};
