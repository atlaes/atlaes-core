import apiClient from './api';

/** Direct client submission of a DRV refund (backend routes/direct-submission-admin.ts). */
export type DispatchMethod =
  | 'post'
  | 'einschreiben'
  | 'fax'
  | 'drv_online'
  | 'courier'
  | 'other';

export interface DirectSubmissionState {
  claimId: string;
  caseType: string;
  route: 'direct' | 'law_firm';
  routeLabel: string;
  applicable: boolean;
  notApplicableReason: string | null;
  missing: string[];
  bankBranch: 'germany' | 'sepa' | 'outside_europe' | null;
  bankWarnings: string[];
  pack: {
    generatedAt: string | null;
    route: string | null;
    signed: boolean;
    totalPages: number | null;
    documents: { key: string; label: string; pages: number }[];
    anlagen: string[];
    warnings: string[];
    recipient: { carrierName: string; mailingAddress: string[] } | null;
    signatureDate: string | null;
  } | null;
  release: { releasedAt: string; releasedBy: string | null } | null;
  dispatch: {
    dispatchedAt: string;
    sender: string | null;
    method: DispatchMethod | null;
    recordedAt: string | null;
    recordedBy: string | null;
  } | null;
  paymentConfirmedAt: string | null;
  releaseBlockers: string[];
  submittedToDrv: boolean;
  postalAgent: {
    name: string;
    coLine?: string | null;
    street: string;
    postalCode: string;
    city: string;
  };
  defaultSender: string | null;
  dispatchMethods: { value: DispatchMethod; label: string }[];
}

const base = (claimId: string) => `/admin/direct-submission/claims/${claimId}`;

export async function getDirectSubmission(
  claimId: string
): Promise<DirectSubmissionState> {
  const { data } = await apiClient.get(base(claimId));
  return data.state;
}

export async function generateDirectPack(
  claimId: string
): Promise<DirectSubmissionState> {
  const { data } = await apiClient.post(`${base(claimId)}/generate`);
  return data.state;
}

export async function getDirectPackDownloadUrl(
  claimId: string
): Promise<{ downloadUrl: string | null; fileName: string }> {
  const { data } = await apiClient.get(`${base(claimId)}/download`);
  return data;
}

export async function releaseDirectPack(
  claimId: string
): Promise<DirectSubmissionState> {
  const { data } = await apiClient.post(`${base(claimId)}/release`);
  return data.state;
}

export async function withdrawDirectRelease(
  claimId: string,
  note?: string
): Promise<DirectSubmissionState> {
  const { data } = await apiClient.post(`${base(claimId)}/release/withdraw`, {
    note: note || null,
  });
  return data.state;
}

export async function recordDirectDispatch(
  claimId: string,
  input: { sender: string; method: DispatchMethod; date: string; note?: string }
): Promise<DirectSubmissionState> {
  const { data } = await apiClient.post(`${base(claimId)}/dispatch`, {
    ...input,
    note: input.note || null,
  });
  return data.state;
}

export async function confirmDirectPayment(
  claimId: string,
  input: { date: string; note?: string }
): Promise<DirectSubmissionState> {
  const { data } = await apiClient.post(`${base(claimId)}/payment-confirmed`, {
    ...input,
    note: input.note || null,
  });
  return data.state;
}
