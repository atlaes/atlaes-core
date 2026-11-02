import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/** Routes that need a session; a dead session elsewhere is just cleared. */
const AUTH_REQUIRED_PREFIXES = ['/claims', '/account', '/dashboard'];

/**
 * Refresh failed (or the refresh token is gone): clear the session and,
 * on an authenticated page, send the customer to sign in with a way back.
 */
function endSession(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (!AUTH_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))) return;
  const redirect = encodeURIComponent(pathname + search);
  window.location.href = `/auth?redirect=${redirect}`;
}

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {
              refreshToken,
            }
          );

          // POST /api/auth/refresh answers `{ message, tokens: { accessToken,
          // refreshToken } }`. Reading `accessToken` off the top level stored
          // the string "undefined" and every later request failed with
          // "Invalid token". The refresh token rotates, so keep both.
          const { accessToken, refreshToken: nextRefreshToken } =
            response.data.tokens;
          if (typeof accessToken !== 'string' || !accessToken) {
            throw new Error('Refresh response has no access token');
          }
          localStorage.setItem('accessToken', accessToken);
          if (typeof nextRefreshToken === 'string' && nextRefreshToken) {
            localStorage.setItem('refreshToken', nextRefreshToken);
          }

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        endSession();
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Message for a failed API call: the backend's `error` string, or the first
 * Zod issue when a request body was rejected (400), else the fallback.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: any } } | null)?.response?.data;
  if (typeof data?.error === 'string' && data.error) return data.error;
  const issue = data?.error?.issues?.[0];
  if (issue && typeof issue.message === 'string') {
    const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
    return path ? `${path}: ${issue.message}` : issue.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Message for a failed magic-link request. A schema rejection (400) carries
 * the Zod error object in `error`, not a string, so it must not be shown
 * (or rendered) as is.
 */
export function magicLinkErrorMessage(error: any): string {
  const msg = error?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (error?.response?.status === 400) {
    return 'Please check your email address and try again.';
  }
  return 'Failed to send magic link. Please try again.';
}

export default apiClient;
