'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../lib/api';

export interface AdminUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
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

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Decode token to check role before making API call
        const payload = decodeJwtPayload(token);
        if (!payload || payload.role !== 'admin') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setError('Access denied — admin only');
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

      // Check role from the access token
      const payload = decodeJwtPayload(tokens.accessToken);
      if (!payload || payload.role !== 'admin') {
        setError('Access denied — admin only');
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
