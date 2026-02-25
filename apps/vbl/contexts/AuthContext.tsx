'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import apiClient from '../lib/api';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    nationality?: string;
    phone?: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (idToken: string, user?: { email?: string; name?: { firstName?: string; lastName?: string } }) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User['profile']>) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  requestMagicLink: (email: string) => Promise<{ magicLink?: string }>;
  verifyMagicLink: (token: string) => Promise<{ isNewUser?: boolean }>;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Return safe default if context is not available (SSR, SSG, or outside provider)
  if (!context) {
    return {
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: async () => {},
      loginWithGoogle: async () => {},
      register: async () => {},
      logout: () => {},
      updateProfile: async () => {},
      changePassword: async () => {},
      requestMagicLink: async () => ({ magicLink: undefined }),
      verifyMagicLink: async () => ({ isNewUser: false }),
    } as AuthContextType;
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const response = await apiClient.get('/auth/me');
          setUser(response.data.user);
        }
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { user: userData, tokens } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Set user
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiClient.post('/auth/register', data);

      const { user: userData, tokens } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Set user
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    // Clear tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Clear user
    setUser(null);

    // Call logout endpoint
    apiClient.post('/auth/logout').catch(() => {
      // Ignore errors on logout
    });
  };

  const updateProfile = async (data: Partial<User['profile']>) => {
    try {
      const response = await apiClient.put('/auth/profile', data);
      setUser(response.data.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Profile update failed');
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password change failed');
    }
  };

  const requestMagicLink = async (email: string) => {
    try {
      const response = await apiClient.post('/auth/magic-link/request', {
        email,
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
      const response = await apiClient.post('/auth/magic-link/verify', {
        token,
      });

      const { user: userData, tokens, isNewUser } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Set user
      setUser(userData);

      // Return additional info for handling new users
      return { isNewUser };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || 'Magic link verification failed'
      );
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      const response = await apiClient.post('/auth/google/verify-id-token', {
        idToken,
      });

      const { user: userData, tokens } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Set user
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Google login failed');
    }
  };

  const loginWithApple = async (
    idToken: string,
    user?: { email?: string; name?: { firstName?: string; lastName?: string } }
  ) => {
    try {
      const response = await apiClient.post('/auth/apple/verify', {
        idToken,
        user,
      });

      const { user: userData, tokens } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);

      // Set user
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Apple login failed');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    loginWithGoogle,
    loginWithApple,
    register,
    logout,
    updateProfile,
    changePassword,
    requestMagicLink,
    verifyMagicLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
