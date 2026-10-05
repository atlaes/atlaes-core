/**
 * Client payout flow API (`/api/account/payout/*`, backend
 * routes/payout.ts). Review the refund decision (Figma 08/09), release
 * the refund (10/11/13), sign the payment instruction (12).
 */
import apiClient from './api';

export interface PayoutPeriod {
  from: string;
  to: string;
  entgeltEur: number | null;
  contributionsEur: number | null;
}

export interface PayoutDecision {
  id: string;
  receivedAt: string;
  decisionDate: string | null;
  office: string | null;
  refundAmountEur: number | null;
  periods: PayoutPeriod[];
  objectionDeadline: string;
  clientReviewBy: string;
  reviewOutcome: 'confirmed' | 'disputed' | null;
  reviewedAt: string | null;
  hasDocument: boolean;
  pageCount: number | null;
}

export interface FeePanelRow {
  kind: 'refund' | 'fee' | 'included' | 'total';
  label: string;
  amount: string;
  value: number;
}

export interface FeePanel {
  variant: 'standard' | 'small';
  title: string;
  rows: FeePanelRow[];
  note: string;
  expander: { title: string; paragraphs: string[] } | null;
  split: { clientAmount: number; fee: number; smallRefund: boolean };
}

export interface PayoutAccount {
  accountHolder: string;
  bank: string;
  country: string;
  currency: string;
  iban?: string | null;
  bic?: string | null;
  accountNumber?: string | null;
  routingLabel?: string | null;
  routingValue?: string | null;
}

export type PayoutRoute = 'A' | 'B' | 'C';

export interface PayoutRelease {
  id: string;
  status: 'open' | 'signed' | 'cancelled';
  valueDate: string;
  amountReceivedEur: number;
  panel: FeePanel;
  account: PayoutAccount | null;
  prefill: PayoutAccount;
  route: PayoutRoute | null;
  routeChoice: { option: 1 | 2 | 3 } | null;
  reviewRequired: boolean;
  signedAt: string | null;
  zeDocumentNumber: string | null;
  blockers: string[];
}

export interface PayoutTask {
  kind: 'review_decision' | 'release_refund';
  id: string;
  title: string;
  dueDate: string | null;
  href: string;
}

export interface PayoutState {
  claimId: string;
  client: { firstName: string | null; lastName: string | null };
  tasks: PayoutTask[];
  decision: PayoutDecision | null;
  release: PayoutRelease | null;
  report: { id: string; createdAt: string | null; status: string } | null;
}

export interface RouteOption {
  option: 1 | 2 | 3;
  route: PayoutRoute;
  available: boolean;
  costRate: number | null;
  costEur: number | null;
  estimatedTargetAmount: number | null;
  executedBy: string | null;
}

export interface RouteOptions {
  currency: string;
  amountAvailableEur: number;
  choiceNeeded: boolean;
  options: RouteOption[];
  referenceRate: { rate: number; date: string } | null;
}

export interface BankDetailsPayload {
  accountHolder: string;
  bank: string;
  country: string;
  currency: string;
  iban?: string | null;
  bic?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  ifsc?: string | null;
  sortCode?: string | null;
  bsb?: string | null;
  transitNumber?: string | null;
  institutionNumber?: string | null;
  clabe?: string | null;
}

export interface ZeSection {
  heading?: string;
  lines: string[];
}

export interface ZePreview {
  text: { german: ZeSection[]; english: ZeSection[] };
  blockers: string[];
}

const BASE = '/account/payout';

export const payoutApi = {
  async getState(): Promise<PayoutState> {
    const { data } = await apiClient.get(BASE);
    return data as PayoutState;
  },
  async decisionDocumentUrl(decisionId: string): Promise<string | null> {
    const { data } = await apiClient.get(
      `${BASE}/decision/${decisionId}/document`
    );
    return (data?.url as string | null) ?? null;
  },
  async confirmDecision(decisionId: string): Promise<void> {
    await apiClient.post(`${BASE}/decision/${decisionId}/confirm`);
  },
  async reportMissing(
    decisionId: string,
    description: string,
    files: File[]
  ): Promise<void> {
    const form = new FormData();
    form.append('description', description);
    files.forEach((f) => form.append('files', f));
    await apiClient.post(`${BASE}/decision/${decisionId}/report`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  /** Resolves with field errors on 422 instead of throwing. */
  async saveBank(
    releaseId: string,
    payload: BankDetailsPayload
  ): Promise<{
    ok: boolean;
    errors: Record<string, string>;
    release: PayoutRelease;
  }> {
    const res = await apiClient.put(
      `${BASE}/release/${releaseId}/bank`,
      payload,
      {
        validateStatus: (s) => s === 200 || s === 422,
      }
    );
    return {
      ok: !!res.data?.success,
      errors: (res.data?.errors as Record<string, string>) ?? {},
      release: res.data?.release as PayoutRelease,
    };
  },
  async routeOptions(releaseId: string): Promise<RouteOptions> {
    const { data } = await apiClient.get(`${BASE}/release/${releaseId}/routes`);
    return data as RouteOptions;
  },
  async chooseRoute(
    releaseId: string,
    option: 1 | 2 | 3
  ): Promise<{
    ok: boolean;
    needsEurAccount: boolean;
    errors: Record<string, string>;
    release: PayoutRelease;
  }> {
    const res = await apiClient.put(
      `${BASE}/release/${releaseId}/route`,
      { option },
      { validateStatus: (s) => s === 200 || s === 422 }
    );
    return {
      ok: !!res.data?.success,
      needsEurAccount: !!res.data?.needsEurAccount,
      errors: (res.data?.errors as Record<string, string>) ?? {},
      release: res.data?.release as PayoutRelease,
    };
  },
  async zePreview(releaseId: string): Promise<ZePreview> {
    const { data } = await apiClient.get(`${BASE}/release/${releaseId}/ze`);
    return data as ZePreview;
  },
  async sign(
    releaseId: string,
    signature: string
  ): Promise<{ release: PayoutRelease; url: string | null }> {
    const { data } = await apiClient.post(`${BASE}/release/${releaseId}/sign`, {
      signature,
      confirmed: true,
    });
    return {
      release: data.release as PayoutRelease,
      url: (data.url as string) ?? null,
    };
  },
  /** Signed ZE: presigned URL, or a blob URL when S3 presigning is off. */
  async signedZeUrl(releaseId: string): Promise<string | null> {
    const res = await apiClient.get(`${BASE}/release/${releaseId}/ze.pdf`, {
      responseType: 'blob',
    });
    const blob = res.data as Blob;
    if (blob.type === 'application/pdf') return URL.createObjectURL(blob);
    const json = JSON.parse(await blob.text()) as { url?: string };
    return json.url ?? null;
  },
};

export default payoutApi;
