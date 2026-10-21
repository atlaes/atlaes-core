import apiClient from './api';

/** EUR 50 deregistration surcharge on a claim (backend migration 0028). */
export interface DeregistrationSurcharge {
  enabled: boolean;
  reason: string | null;
  setAt: string | null;
  setBy: string | null;
  /** Configured amount (EUR incl. VAT) added when enabled. */
  amountEur: number;
  /** Amount frozen on the release once funds are recorded. */
  appliedEur: number | null;
  /** True once funds are recorded; the flag can no longer change. */
  locked: boolean;
}

export async function getDeregistrationSurcharge(
  claimId: string
): Promise<DeregistrationSurcharge> {
  const { data } = await apiClient.get(`/admin/payout/claims/${claimId}`);
  return data.deregistrationSurcharge;
}

export async function setDeregistrationSurcharge(
  claimId: string,
  input: { enabled: boolean; reason?: string | null }
): Promise<DeregistrationSurcharge> {
  const { data } = await apiClient.put(
    `/admin/payout/claims/${claimId}/deregistration-surcharge`,
    input
  );
  return data.deregistrationSurcharge;
}
