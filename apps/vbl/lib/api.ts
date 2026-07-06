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

          // Item 21: POST /api/auth/refresh (packages/functions/src/routes/
          // auth.ts) responds with `{ message, tokens: { accessToken,
          // refreshToken } }` — the access token is nested under `tokens`,
          // not top-level. Destructuring `accessToken` directly off
          // response.data read undefined, so `localStorage.setItem` stored
          // the literal string "undefined" as the access token. Every
          // subsequent request (including the retried one below) then sent
          // `Authorization: Bearer undefined`, which fails JWT verification
          // with a generic "Invalid token" 401 — and keeps failing for the
          // rest of the session since the corrupted value persists in
          // localStorage. This is what the user saw as "Invalid token" when
          // deleting and re-drawing the signature: the access token expires
          // around the last onboarding step, the refresh silently corrupts
          // itself, and every later request (including the delete + re-enter
          // retry) inherits the broken token.
          const { accessToken } = response.data.tokens;
          localStorage.setItem('accessToken', accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
