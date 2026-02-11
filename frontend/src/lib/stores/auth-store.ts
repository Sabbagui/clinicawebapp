import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { loginAPI } from '@/lib/api/endpoints/auth';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { access_token, user } = await loginAPI(email, password);

          // Store token in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', access_token);
          }

          // Update store state
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear all auth data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth-storage');
        }

        // Reset state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });

        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      checkAuth: () => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('auth_token');
        const storedUser = get().user;

        if (token && storedUser) {
          set({
            isAuthenticated: true,
            token,
            user: storedUser,
          });
        } else {
          set({
            isAuthenticated: false,
            token: null,
            user: null,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        // Only use localStorage in browser environment
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
