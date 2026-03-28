import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { loginAPI } from '@/lib/api/endpoints/auth';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { access_token, refresh_token, user } = await loginAPI(email, password);

          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
          }

          set({
            user,
            token: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth-storage');
        }

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
        set({ token: accessToken, refreshToken });
      },

      checkAuth: () => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refresh_token');
        const storedUser = get().user;

        if (token && storedUser) {
          set({
            isAuthenticated: true,
            token,
            refreshToken: refreshToken ?? get().refreshToken,
            user: storedUser,
          });
        } else {
          set({
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            user: null,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
