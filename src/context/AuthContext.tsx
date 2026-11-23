import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, broadcastAuthSessionEvent, setAuthToken, setAuthErrorHandler, AUTH_SESSION_SYNC_KEY } from '../api/client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  assignedUnitId?: string | null;
  departmentId?: string | null;
  employeeId?: string | null;
  token?: string;
}

interface AuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const user = await apiRequest<AdminUser>('/auth/me');
      if (user?.token) {
        setAuthToken(user.token);
      }
      setAdminUser(user);
    } catch {
      setAuthToken(null);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setAuthErrorHandler((notice: string) => {
      setAuthToken(null);
      setAdminUser(null);
      try {
        sessionStorage.setItem('seating_auth_notice', notice);
      } catch {
        // Keep auth state cleanup and redirect working when session storage is unavailable.
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = `/login?notice=${encodeURIComponent(notice)}`;
      }
    });

    void refreshMe();

    const handleSessionSync = () => { void refreshMe(); };
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === AUTH_SESSION_SYNC_KEY) handleSessionSync();
    };
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener(AUTH_SESSION_SYNC_KEY, handleSessionSync);

    return () => {
      setAuthErrorHandler(null);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener(AUTH_SESSION_SYNC_KEY, handleSessionSync);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<AdminUser & { token?: string; user?: AdminUser & { token?: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const user = res.user || res;
    const token = res.token || user.token;
    if (token) {
      setAuthToken(token);
    }
    setAdminUser(user);
    broadcastAuthSessionEvent('login');
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
      setAdminUser(null);
      broadcastAuthSessionEvent('logout');
    }
  };

  return (
    <AuthContext.Provider value={{ adminUser, isLoading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
