import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Browser requests stay same-origin (`/api/...`) so Next.js can proxy via rewrites.
// SSR can call the backend directly using INTERNAL_API_URL (set in Docker compose).
const serverApiBaseUrl =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://backend:3001' : 'http://localhost:3001');

const apiClient: AxiosInstance = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : serverApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Extend config type to carry the retry flag
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Queue of requests waiting for token refresh to complete
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

// Request interceptor — inject auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor — 401 → try refresh once, then logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // If the failing request IS the refresh endpoint → session expired, logout
      if (originalRequest?.url?.includes('/auth/refresh')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth-storage');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Already retried once → give up
      if (originalRequest?._retry) {
        return Promise.reject(error);
      }

      // Enqueue if a refresh is already in progress
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return apiClient(originalRequest);
            }
          })
          .catch((err) => Promise.reject(err));
      }

      const storedRefreshToken = localStorage.getItem('refresh_token');

      if (!storedRefreshToken) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth-storage');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (originalRequest) originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios
          .post('/api/auth/refresh', { refresh_token: storedRefreshToken })
          .then(({ data }) => {
            const { access_token, refresh_token } = data as {
              access_token: string;
              refresh_token: string;
            };

            localStorage.setItem('auth_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;

            if (originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }

            processQueue(null, access_token);
            resolve(originalRequest ? apiClient(originalRequest) : undefined);
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('auth-storage');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Acesso negado: Você não tem permissão para esta ação');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
