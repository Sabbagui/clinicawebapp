import type { User } from './index';

/**
 * API Response Types
 */

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Pagination Types
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
