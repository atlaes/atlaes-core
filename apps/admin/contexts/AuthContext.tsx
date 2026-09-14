'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../lib/api';

// Roles this app serves. Admins land on /claims, law-firm users on /portal.
export type AppRole = 'admin' | 'law_firm';
const APP_ROLES: AppRole[] = ['admin', 'law_firm'];

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === 'string' && APP_ROLES.includes(role as AppRole);
}

export function homeForRole(role: AppRole | null | undefined): string {
  return role === 'law_firm' ? '/portal' : '/home';
}

export interface AdminUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: AppRole;
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  requestMagicLink: (email: string) => Promise<{ magicLink?: string }>;
  verifyMagicLink: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
      requestMagicLink: async () => ({ magicLink: undefined }),
      verifyMagicLink: async () => {},
      logout: () => {},
    } as AuthContextType;
  }
  return context;
};

/**
 * Redirect guard for role-gated pages. Sends anonymous users to the login
 * page and signed-in users of the wrong role to their own home.
 */
export function useRequireRole(role: AppRole) {
  const auth = useAuth();
  const allowed = auth.user?.role === role;
  return { ...auth, allowed };
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

const ACCESS_DENIED =
  'Access denied — this sign-in is for ops and partner law firm accounts';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const payload = decodeJwtPayload(token);
        if (!payload || !isAppRole(payload.role)) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setError(ACCESS_DENIED);
          setIsLoading(false);
          return;
        }

        const response = await apiClient.get('/auth/me');
        setUser({ ...response.data.user, role: payload.role });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const requestMagicLink = async (email: string) => {
    try {
      setError(null);
      const response = await apiClient.post('/auth/magic-link/request', {
        email,
        callbackUrl: window.location.origin,
      });
      return { magicLink: response.data.magicLink };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || 'Failed to send magic link'
      );
    }
  };

  const verifyMagicLink = async (token: string) => {
    try {
      setError(null);
      const response = await apiClient.post('/auth/magic-link/verify', {
        token,
      });

      const { user: userData, tokens } = response.data;
      const payload = decodeJwtPayload(tokens.accessToken);
      if (!payload || !isAppRole(payload.role)) {
        setError(ACCESS_DENIED);
        return;
      }

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      setUser({ ...userData, role: payload.role });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || 'Magic link verification failed'
      );
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setError(null);
    apiClient.post('/auth/logout').catch(() => {});
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    error,
    requestMagicLink,
    verifyMagicLink,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
