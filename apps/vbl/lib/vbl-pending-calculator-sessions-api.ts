import apiClient from './api';

export interface VBLPendingCalculatorSessionPayload {
  jobs: unknown[];
  calculationResult?: {
    totalRefund: number;
    breakdown: unknown[];
    totalMonths: number;
  } | null;
  scenario?: string;
  dateOfBirth?: string;
  currentAge?: number;
  userType?: string;
  pensionProvider?: string;
  claimTypes: string[];
  publicStageProvider?: string;
  privateProvider?: string;
}

export interface VBLPendingCalculatorSession
  extends VBLPendingCalculatorSessionPayload {
  id: string;
  token: string;
  email: string | null;
  expiresAt: string;
  createdAt: string;
}

export async function createPendingCalculatorSession(
  payload: VBLPendingCalculatorSessionPayload
): Promise<{ token: string }> {
  const res = await apiClient.post(
    '/vbl/pending-calculator-sessions',
    payload
  );
  if (!res.data?.success) {
    throw new Error(
      res.data?.error ?? 'Failed to create pending calculator session'
    );
  }
  return { token: res.data.token };
}

export async function getPendingCalculatorSession(
  token: string
): Promise<VBLPendingCalculatorSession | null> {
  try {
    const res = await apiClient.get(
      `/vbl/pending-calculator-sessions/${token}`
    );
    return res.data?.success ? res.data.session : null;
  } catch (err: unknown) {
    if ((err as { response?: { status: number } }).response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function linkEmailToPendingCalculatorSession(
  token: string,
  email: string
): Promise<void> {
  await apiClient.patch(
    `/vbl/pending-calculator-sessions/${token}/email`,
    { email }
  );
}
