'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setTokens, clearTokens } from '@/lib/api';
import type { ApiResponse, User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    api.get<ApiResponse<User>>('/auth/me')
      .then((res) => setUser(res.data ?? null))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/login', { email, password },
    );
    if (!res.success || !res.data) throw new Error(res.message ?? 'Login failed');
    setTokens(res.data.accessToken, res.data.refreshToken);
    const me = await api.get<ApiResponse<User>>('/auth/me');
    setUser(me.data ?? null);
  }

  function logout() {
    api.post('/auth/logout').catch(() => {});
    clearTokens();
    setUser(null);
  }

  function hasPermission(permission: string): boolean {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.permissions?.includes(permission) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
