'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Custom hook to access authentication state and methods
 * Provides convenient access to user, auth status, and auth actions
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };
}
