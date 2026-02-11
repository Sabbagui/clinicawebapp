import apiClient from '../client';
import type { User } from '@/types';

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Authenticate user with email and password
 * @param email User email
 * @param password User password
 * @returns Access token and user data
 */
export const loginAPI = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/api/auth/login', {
    email,
    password,
  });
  return response.data;
};

/**
 * Get current authenticated user profile
 * Requires valid JWT token in Authorization header
 * @returns Current user data
 */
export const getMeAPI = async (): Promise<User> => {
  const response = await apiClient.post<User>('/api/auth/me');
  return response.data;
};
