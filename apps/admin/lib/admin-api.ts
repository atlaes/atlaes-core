import apiClient from './api';

export interface ClaimListItem {
  id: string;
  userId: string;
  status: string;
  workflowState: string;
  claimType: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  paymentStatus: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimDetail {
  id: string;
  userId: string;
  applicationId: string | null;
  status: string;
  workflowState: string;
  completedSteps: Record<string, boolean>;
  claimType: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportIssueDate: string | null;
  passportExpiryDate: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentCity: string | null;
  currentPostalCode: string | null;
  currentCountry: string | null;
  svNummer: string | null;
  germanStreet: string | null;
  germanPostalCode: string | null;
  germanCity: string | null;
  moveOutDate: string | null;
  abmeldungMethod: string | null;
  deregistrationServiceRequested: boolean | null;
  preferredCurrency: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  bsb: string | null;
  swiftBic: string | null;
  iban: string | null;
  bankStreet: string | null;
  bankCity: string | null;
  bankPostalCode: string | null;
  bankCountry: string | null;
  signatureId: string | null;
  signatureCompletedAt: string | null;
  identityFormDownloadedAt: string | null;
  certifyingAuthority: string | null;
  identityVerifiedAt: string | null;
  confirmationAccuracyAccepted: boolean | null;
  confirmationAuthorizationAccepted: boolean | null;
  paymentStatus: string | null;
  stripePaymentId: string | null;
  paidAt: string | null;
  serviceFee: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  documentId: string;
  documentRole: string;
  createdAt: string;
  document?: {
    id: string;
    fileName: string;
    fileType: string;
    s3Key: string;
    status: string | null;
  };
}

export interface WorkflowEntry {
  id: string;
  claimId: string;
  state: string;
  previousState: string | null;
  triggeredBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ClaimStats {
  total: number;
  draft: number;
  ready: number;
  submitted: number;
  processing: number;
  completed: number;
  rejected: number;
}

export interface ClaimDetailResponse {
  claim: ClaimDetail;
  documents: ClaimDocument[];
  workflow: WorkflowEntry[];
  userInfo: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

// Admin API functions

export async function getStats(): Promise<ClaimStats> {
  const { data } = await apiClient.get('/admin/stats');
  return data.stats;
}

export async function getClaims(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  claims: ClaimListItem[];
  total: number;
  page: number;
  limit: number;
}> {
  const { data } = await apiClient.get('/admin/claims', { params });
  return data;
}

export async function getClaimDetail(
  id: string
): Promise<ClaimDetailResponse> {
  const { data } = await apiClient.get(`/admin/claims/${id}`);
  return data;
}

export async function updateClaimStatus(
  id: string,
  status: string,
  note?: string
): Promise<ClaimDetail> {
  const { data } = await apiClient.put(`/admin/claims/${id}/status`, {
    status,
    note,
  });
  return data.claim;
}

export async function addNote(id: string, note: string): Promise<void> {
  await apiClient.post(`/admin/claims/${id}/notes`, { note });
}

export async function getDocumentDownloadUrl(
  claimId: string,
  docId: string
): Promise<{ downloadUrl: string | null; fileName: string; fileType: string }> {
  const { data } = await apiClient.get(
    `/admin/claims/${claimId}/documents/${docId}/download`
  );
  return data;
}
