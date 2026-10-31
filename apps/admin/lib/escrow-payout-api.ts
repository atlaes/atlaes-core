import apiClient from './api';

/** Escrow payout controls on a claim (backend escrow spec 30 Oct 2026). */
export interface EscrowTransfer {
  releaseId: string;
  route: 'A' | 'B' | 'C' | null;
  invitedAt: string | null;
  signedAt: string | null;
  onwardAmount: number | null;
  onwardCurrency: string | null;
  onwardTransferDate: string | null;
  hasReceipt: boolean;
  expectedArrivalDate: string | null;
  receiptStatus: 'confirmed' | 'not_received' | null;
  receiptStatusAt: string | null;
}

export interface EscrowEmail {
  id: string;
  template: string;
  status: 'sending' | 'sent' | 'settled';
  recipient: string | null;
  bcc: string | null;
  sentAt: string | null;
  templateVersion: string | null;
}

export interface EscrowTask {
  id: string;
  kind: string;
  label: string;
  urgent: boolean;
  detail: string | null;
  status: 'open' | 'done';
  createdAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface EscrowView {
  today: string;
  pendingUpload: {
    decisionId: string;
    uploadedAt: string | null;
    documentUrl: string | null;
  } | null;
  hold: { reason: string | null; at: string | null } | null;
  contactPause: {
    reason: string | null;
    at: string | null;
    nextContactDate: string | null;
  } | null;
  decisionDirectToClientAt: string | null;
  decisionNotReceivedAt: string | null;
  transfers: EscrowTransfer[];
  emails: EscrowEmail[];
  tasks: EscrowTask[];
}

export type DecisionRecipient = 'law_firm' | 'client' | 'atlaes';

const base = (claimId: string) => `/admin/payout/claims/${claimId}`;

export async function getEscrow(claimId: string): Promise<EscrowView> {
  const { data } = await apiClient.get(`${base(claimId)}/escrow`);
  return data;
}

export async function setPayoutHold(claimId: string, reason: string | null) {
  await apiClient.put(`${base(claimId)}/hold`, { reason });
}

export async function setContactPause(
  claimId: string,
  pause: { reason: string; nextContactDate: string | null } | null
) {
  await apiClient.put(`${base(claimId)}/contact-pause`, pause);
}

export async function setDecisionDirect(claimId: string, direct: boolean) {
  await apiClient.put(`${base(claimId)}/decision-direct`, { direct });
}

export async function publishDecision(
  claimId: string,
  decisionId: string,
  input: {
    receivedAt: string | null;
    atlaesReceivedAt: string | null;
    reviewBy: string | null;
    recipient: DecisionRecipient | null;
  }
) {
  await apiClient.post(
    `${base(claimId)}/decision/${decisionId}/publish`,
    input
  );
}

export async function recordOnwardTransfer(
  claimId: string,
  releaseId: string,
  input: {
    amount: string;
    currency: string;
    transferDate: string;
    expectedArrival: string;
    receipt: File | null;
  }
) {
  const form = new FormData();
  for (const k of [
    'amount',
    'currency',
    'transferDate',
    'expectedArrival',
  ] as const)
    if (input[k]) form.append(k, input[k]);
  if (input.receipt) form.append('receipt', input.receipt);
  await apiClient.post(`${base(claimId)}/releases/${releaseId}/onward`, form);
}

export async function setExpectedArrival(
  claimId: string,
  releaseId: string,
  date: string | null
) {
  await apiClient.put(`${base(claimId)}/releases/${releaseId}/arrival`, {
    date,
  });
}

export async function resolvePayoutTask(taskId: string, note: string | null) {
  await apiClient.post(`/admin/payout/tasks/${taskId}/resolve`, { note });
}

/** Route-B payouts for the TransferMate sheet (columns A–Y). */
export async function downloadTransferMateCsv(): Promise<void> {
  const { data } = await apiClient.get('/admin/payouts/transfermate.csv', {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TransferMate_transfers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
