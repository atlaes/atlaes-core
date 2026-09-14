import apiClient from './api';

// Client for /api/law-firm — the partner law firm's own view. Every
// endpoint is scoped server-side to the caller's firm.

export type LawFirmCaseState =
  | 'new'
  | 'downloaded'
  | 'submitted'
  | 'response_received'
  | 'closed';

export type LawFirmCaseEvent =
  | 'downloaded'
  | 'submitted'
  | 'response_received'
  | 'closed';

export type LawFirmSubmissionChannel = 'post' | 'email' | 'fax' | 'portal';

export const CASE_STATE_LABELS: Record<LawFirmCaseState, string> = {
  new: 'New',
  downloaded: 'Downloaded',
  submitted: 'Sent to provider',
  response_received: 'Response received',
  closed: 'Closed',
};

export const CHANNEL_LABELS: Record<LawFirmSubmissionChannel, string> = {
  post: 'Post',
  email: 'Email',
  fax: 'Fax',
  portal: 'Provider portal',
};

export interface LawFirmSummary {
  id: string;
  name: string;
  contactEmail: string | null;
  notificationEmail: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  active: boolean;
}

export interface LawFirmMembership {
  id: string;
  lawFirmId: string;
  userId: string;
  role: 'member' | 'firm_admin';
  active: boolean;
  createdAt: string | null;
}

export interface FirmMe {
  firm: LawFirmSummary;
  membership: LawFirmMembership;
  user: { id: string; email: string };
}

export interface FirmClaimListItem {
  id: string;
  claimantName: string | null;
  status: string | null;
  pensionType: string | null;
  bavRoute: 'A' | 'B' | null;
  lawFirmRef: string | null;
  caseState: LawFirmCaseState;
  assignedAt: string | null;
  submittedAt: string | null;
  packageReady: boolean;
  updatedAt: string | null;
}

export interface CorrespondenceItem {
  id: string;
  claimId: string;
  direction: string;
  source: string;
  note: string | null;
  receivedDate: string | null;
  createdAt: string | null;
  uploadedBy: { id: string; email: string | null } | null;
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  } | null;
}

export interface CaseEventEntry {
  id: string;
  event: string;
  actor: string | null;
  note: string | null;
  date: string | null;
  channel: string | null;
  createdAt: string | null;
}

export interface FirmCaseDetail {
  claim: {
    id: string;
    status: string | null;
    pensionType: string | null;
    caseState: LawFirmCaseState;
    lawFirmRef: string | null;
    payoutTarget: string | null;
    assignedAt: string | null;
    downloadedAt: string | null;
    firmSubmittedAt: string | null;
    submissionChannel: string | null;
    responseAt: string | null;
    closedAt: string | null;
    submittedAt: string | null;
    packageReady: boolean;
    copyReady: boolean;
    claimant: {
      name: string | null;
      salutation: string | null;
      firstName: string | null;
      lastName: string | null;
      dateOfBirth: string | null;
      nationality: string | null;
      email: string | null;
      address: {
        line1: string | null;
        line2: string | null;
        city: string | null;
        postalCode: string | null;
        country: string | null;
      };
      germanAddress: {
        street: string | null;
        postalCode: string | null;
        city: string | null;
        moveOutDate: string | null;
      };
      taxId: string | null;
      ibanMasked: string | null;
      accountHolderName: string | null;
    };
    bav: {
      route: 'A' | 'B' | null;
      employerName: string | null;
      employmentEndDate: string | null;
      providerName: string | null;
      durchfuehrungsweg: string | null;
      contractReferenceLabel: string | null;
      contractReference: string | null;
      drvOffice: string | null;
      drvDecisionDate: string | null;
      statementType: string | null;
      statementDate: string | null;
      benefitForm: string | null;
      benefitAmount: string | null;
      addresseeType: string | null;
      recipient: {
        name: string | null;
        department: string | null;
        street: string | null;
        postalCode: string | null;
        city: string | null;
        ref: string | null;
      };
    };
  };
  correspondence: CorrespondenceItem[];
  events: CaseEventEntry[];
}

export async function getFirmMe(): Promise<FirmMe> {
  const { data } = await apiClient.get('/law-firm/me');
  return data;
}

export async function getFirmClaims(params?: {
  caseState?: LawFirmCaseState;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  claims: FirmClaimListItem[];
  total: number;
  page: number;
  limit: number;
}> {
  const { data } = await apiClient.get('/law-firm/claims', { params });
  return data;
}

export async function getFirmCase(id: string): Promise<FirmCaseDetail> {
  const { data } = await apiClient.get(`/law-firm/claims/${id}`);
  return data;
}

export async function getFirmDownload(
  id: string,
  kind: 'package' | 'copy'
): Promise<{ downloadUrl: string | null; fileName: string }> {
  const { data } = await apiClient.get(`/law-firm/claims/${id}/${kind}`);
  return data;
}

export async function setFirmReference(
  id: string,
  lawFirmRef: string
): Promise<{ lawFirmRef: string; regenerated: boolean }> {
  const { data } = await apiClient.put(`/law-firm/claims/${id}/reference`, {
    lawFirmRef,
  });
  return data;
}

export async function recordFirmEvent(
  id: string,
  input: {
    event: LawFirmCaseEvent;
    date?: string | null;
    channel?: LawFirmSubmissionChannel | null;
    note?: string | null;
  }
): Promise<{ caseState: LawFirmCaseState }> {
  const { data } = await apiClient.post(`/law-firm/claims/${id}/events`, input);
  return data;
}

export async function uploadFirmCorrespondence(
  id: string,
  file: File,
  input: { note?: string; receivedDate?: string }
): Promise<CorrespondenceItem> {
  const form = new FormData();
  form.append('file', file);
  if (input.note) form.append('note', input.note);
  if (input.receivedDate) form.append('receivedDate', input.receivedDate);
  const { data } = await apiClient.post(
    `/law-firm/claims/${id}/correspondence`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.correspondence;
}

export async function getFirmCorrespondenceDownload(
  id: string,
  corrId: string
): Promise<{ downloadUrl: string | null; fileName: string }> {
  const { data } = await apiClient.get(
    `/law-firm/claims/${id}/correspondence/${corrId}/download`
  );
  return data;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return e?.response?.data?.error ?? e?.message ?? fallback;
}
