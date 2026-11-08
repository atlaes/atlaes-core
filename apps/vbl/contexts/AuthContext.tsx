'use client';

import type { AxiosRequestConfig } from 'axios';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import apiClient from '../lib/api';
import { clearUserScopedStorage } from '../lib/user-scoped-storage';

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
  loginWithApple: (
    idToken: string,
    user?: {
      email?: string;
      name?: { firstName?: string; lastName?: string };
    }
  ) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User['profile']>) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  requestMagicLink: (
    email: string,
    redirectUrl?: string
  ) => Promise<{ magicLink?: string }>;
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
      loginWithApple: async () => {},
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

const storeTokens = (tokens: AuthTokens) => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
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
      } catch (error: any) {
        // Only a definitive 401 (after the interceptor's refresh attempt)
        // means the session is gone. A network error or a 5xx must not log
        // the user out — keep the tokens so the next load can retry.
        if (error?.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { user: userData, tokens } = response.data;
      storeTokens(tokens);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const response = await apiClient.post('/auth/register', data);

      const { user: userData, tokens } = response.data;
      storeTokens(tokens);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }, []);

  const logout = useCallback(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    // Clear tokens and everything else that belongs to this account
    // (draft claim id, persisted flow state) before dropping the user.
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearUserScopedStorage();

    setUser(null);

    // Tell the server with the tokens read above (the API client reads
    // them from localStorage, which is already cleared). The refresh token
    // goes in the body so logout also ends a session whose access token
    // has expired; _retry skips the client's refresh-and-redirect on 401.
    if (accessToken || refreshToken) {
      apiClient
        .post('/auth/logout', { refreshToken }, {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
          _retry: true,
        } as AxiosRequestConfig & { _retry: boolean })
        .catch(() => {
          // Ignore errors on logout
        });
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User['profile']>) => {
    try {
      const response = await apiClient.put('/auth/profile', data);
      setUser(response.data.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Profile update failed');
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        // PUT /api/auth/change-password (routes/auth.ts); POST is a 404.
        await apiClient.put('/auth/change-password', {
          currentPassword,
          newPassword,
        });
      } catch (error: any) {
        throw new Error(
          error.response?.data?.error || 'Password change failed'
        );
      }
    },
    []
  );

  const requestMagicLink = useCallback(
    async (email: string, redirectUrl?: string) => {
      try {
        const response = await apiClient.post('/auth/magic-link/request', {
          email,
          ...(redirectUrl ? { redirectUrl } : {}),
        });
        return { magicLink: response.data.magicLink };
      } catch (error: any) {
        throw new Error(
          error.response?.data?.error || 'Failed to send magic link'
        );
      }
    },
    []
  );

  const verifyMagicLink = useCallback(async (token: string) => {
    try {
      const response = await apiClient.post('/auth/magic-link/verify', {
        token,
      });

      const { user: userData, tokens, isNewUser } = response.data;
      storeTokens(tokens);
      setUser(userData);

      // Return additional info for handling new users
      return { isNewUser };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || 'Magic link verification failed'
      );
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const response = await apiClient.post('/auth/google/verify-id-token', {
        idToken,
      });

      const { user: userData, tokens } = response.data;
      storeTokens(tokens);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Google login failed');
    }
  }, []);

  const loginWithApple = useCallback(
    async (
      idToken: string,
      appleUser?: {
        email?: string;
        name?: { firstName?: string; lastName?: string };
      }
    ) => {
      try {
        const response = await apiClient.post('/auth/apple/verify', {
          idToken,
          user: appleUser,
        });

        const { user: userData, tokens } = response.data;
        storeTokens(tokens);
        setUser(userData);
      } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Apple login failed');
      }
    },
    []
  );

  // Memoised so consumers that list context functions as effect
  // dependencies (e.g. the magic-link page) don't re-run on every render.
  const value = useMemo<AuthContextType>(
    () => ({
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
    }),
    [
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
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
