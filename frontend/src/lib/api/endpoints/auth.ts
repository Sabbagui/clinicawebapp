import apiClient from '../client';
import type { User } from '@/types';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Authenticate user with email and password
 * @returns Access token, refresh token and user data
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
 * Exchange a refresh token for a new token pair
 */
export const refreshTokenAPI = async (
  refreshToken: string
): Promise<RefreshResponse> => {
  const response = await apiClient.post<RefreshResponse>('/api/auth/refresh', {
    refresh_token: refreshToken,
  });
  return response.data;
};

/**
 * Get current authenticated user profile
 */
export const getMeAPI = async (): Promise<User> => {
  const response = await apiClient.post<User>('/api/auth/me');
  return response.data;
};
