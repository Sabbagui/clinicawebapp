import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with base configuration
// Use empty baseURL in browser so Next.js can proxy requests via rewrites
// Use full URL in SSR for direct backend calls
const apiClient: AxiosInstance = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - automatically inject auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only add token if we're in a browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth-storage');

        // Redirect to login only if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // Handle 403 Forbidden - insufficient permissions
    if (error.response?.status === 403) {
      console.error('Acesso negado: Você não tem permissão para esta ação');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
