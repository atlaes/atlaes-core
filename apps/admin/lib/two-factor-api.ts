import axios, { AxiosError } from 'axios';

/**
 * Law-firm portal two-factor sign-in (/api/auth/2fa).
 *
 * A plain axios instance on purpose: the shared apiClient refreshes and
 * redirects on 401, which would throw a user out of the sign-in screen
 * when a challenge expires.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const client = axios.create({
  baseURL: `${API_BASE_URL}/api/auth/2fa`,
  headers: { 'Content-Type': 'application/json' },
});

const CHALLENGE_KEY = 'portal2faChallenge';

export interface PortalChallenge {
  challengeToken: string;
  challengeExpiresAt: string;
  email: string;
  enrolmentRequired: boolean;
}

export interface PortalSession {
  user: { id: string; email: string; emailVerified: boolean; role: string };
  tokens: { accessToken: string; refreshToken: string };
}

export class TwoFactorApiError extends Error {
  constructor(
    message: string,
    public code: string | undefined,
    public status: number | undefined,
    public attemptsLeft?: number
  ) {
    super(message);
  }
}

// ---------------- challenge storage (tab-scoped) ----------------

export function saveChallenge(challenge: PortalChallenge): void {
  try {
    sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenge));
  } catch {
    /* private mode: the page falls back to step 1 */
  }
}

export function loadChallenge(): PortalChallenge | null {
  try {
    const raw = sessionStorage.getItem(CHALLENGE_KEY);
    return raw ? (JSON.parse(raw) as PortalChallenge) : null;
  } catch {
    return null;
  }
}

export function clearChallenge(): void {
  try {
    sessionStorage.removeItem(CHALLENGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------- calls ----------------

/** Subject: the pending challenge, or (admin step-up) the stored access token. */
function subject(challenge: PortalChallenge | null) {
  if (challenge) return { body: { challengeToken: challenge.challengeToken }, headers: {} };
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    body: {},
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

async function post<T>(
  path: string,
  challenge: PortalChallenge | null,
  extra: Record<string, unknown> = {}
): Promise<T> {
  const s = subject(challenge);
  try {
    const res = await client.post(path, { ...s.body, ...extra }, { headers: s.headers });
    return res.data as T;
  } catch (err) {
    const e = err as AxiosError<{ error?: string; code?: string; attemptsLeft?: number }>;
    throw new TwoFactorApiError(
      e.response?.data?.error || 'Something went wrong. Please try again.',
      e.response?.data?.code,
      e.response?.status,
      e.response?.data?.attemptsLeft
    );
  }
}

export const getTwoFactorStatus = (c: PortalChallenge | null) =>
  post<{ email: string; enrolled: boolean }>('/status', c);

export const startEnrolment = (c: PortalChallenge | null) =>
  post<{ otpauthUri: string; manualKey: string; qrSvg: string; issuer: string }>(
    '/enrol/start',
    c
  );

export const confirmEnrolment = (c: PortalChallenge | null, code: string) =>
  post<PortalSession & { recoveryCodes: string[] }>('/enrol/confirm', c, { code });

export const verifyCode = (c: PortalChallenge | null, code: string) =>
  post<PortalSession & { recoveryCodesLeft: number }>('/verify', c, { code });

export const verifyRecoveryCode = (c: PortalChallenge | null, recoveryCode: string) =>
  post<PortalSession & { recoveryCodesLeft: number }>('/verify', c, { recoveryCode });

/** Stores the 2FA-backed session the portal requires. */
export function storeSession(session: PortalSession): void {
  localStorage.setItem('accessToken', session.tokens.accessToken);
  localStorage.setItem('refreshToken', session.tokens.refreshToken);
  clearChallenge();
}
