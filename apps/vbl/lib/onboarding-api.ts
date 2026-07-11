import { apiClient } from './api';

// ============================================================
// Auth
// ============================================================

export interface MagicLinkResponse {
  message: string;
  magicLink?: string; // Returned in dev mode for easy testing
}

export interface VerifyMagicLinkResponse {
  message: string;
  user: { id: string; email: string; emailVerified: boolean };
  tokens: { accessToken: string; refreshToken: string };
  isNewUser: boolean;
}

export async function requestMagicLink(
  email: string,
  redirectUrl?: string
): Promise<MagicLinkResponse> {
  const { data } = await apiClient.post('/auth/magic-link/request', {
    email,
    redirectUrl,
  });
  return data;
}

export async function verifyMagicLink(
  token: string
): Promise<VerifyMagicLinkResponse> {
  const { data } = await apiClient.post('/auth/magic-link/verify', { token });
  return data;
}

// ============================================================
// Documents
// ============================================================

export interface DocumentUploadResponse {
  success: boolean;
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    documentType: string | null;
    status: string;
    createdAt: string;
  };
  ocr: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    placeOfBirth: string;
    nationality: string;
    passportNumber: string;
    passportIssueDate: string;
    passportExpiryDate: string;
    issuingCountry: string;
    mrz1?: string;
    mrz2?: string;
  } | null;
}

export async function uploadDocument(
  file: File,
  documentType: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  const { data } = await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ============================================================
// Health Insurance Document Extraction (Task 15)
// ============================================================

export interface HealthInsuranceExtractionResponse {
  success: boolean;
  extraction: {
    details: {
      type: 'statutory' | 'private' | null;
      providerName: string | null;
      providerAddress: string | null;
      insuredSinceMonth: string | null;
      insuredSinceYear: string | null;
      placeOfBirth: string | null;
      countryOfBirth: string | null;
      insuranceNumber: string | null;
    };
    confidence: Record<string, number>;
    missingFields: string[];
    model: string;
  };
}

export async function extractHealthInsuranceDocument(
  file: File
): Promise<HealthInsuranceExtractionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post(
    '/vbl/extract-health-insurance-document',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

// ============================================================
// Signatures
// ============================================================

export interface SignatureUploadResponse {
  success: boolean;
  signature: {
    id: string;
    s3Key: string;
    createdAt: string;
  };
}

export async function uploadSignature(
  signatureData: string
): Promise<SignatureUploadResponse> {
  const { data } = await apiClient.post('/signatures/upload', {
    signatureData,
  });
  return data;
}

// ============================================================
// Claims
// ============================================================

export interface Claim {
  id: string;
  userId: string;
  status:
    | 'draft'
    | 'ready'
    | 'submitted'
    | 'processing'
    | 'completed'
    | 'rejected';
  workflowState: string;
  completedSteps: Record<string, boolean>;
  claimType?: string;
  // Personal
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  passportNumber?: string;
  placeOfBirth?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  // Address
  currentAddressLine1?: string;
  currentAddressLine2?: string;
  currentCity?: string;
  currentPostalCode?: string;
  currentCountry?: string;
  // German Address
  germanStreet?: string;
  germanPostalCode?: string;
  germanCity?: string;
  moveOutDate?: string;
  // Health Insurance (Task 15, bAV/private pension type only)
  healthInsuranceType?: string;
  healthInsuranceProviderName?: string;
  healthInsuranceProviderAddress?: string;
  healthInsuranceInsuredSinceMonth?: string;
  healthInsuranceInsuredSinceYear?: string;
  healthInsurancePlaceOfBirth?: string;
  healthInsuranceCountryOfBirth?: string;
  healthInsuranceNumber?: string;
  // Bank
  iban?: string;
  accountHolderName?: string;
  bankName?: string;
  preferredCurrency?: string;
  // Membership
  svNummer?: string;
  // Signature
  signatureId?: string;
  signatureCompletedAt?: string;
  // Payment
  paymentStatus?: string;
  stripePaymentId?: string;
  paidAt?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  documentId: string;
  documentRole: string;
  createdAt: string | null;
  document?: {
    id: string;
    fileName: string;
    fileType: string;
    s3Key: string;
    status: string | null;
  };
}

export interface WorkflowHistoryEntry {
  id: string;
  claimId: string;
  state: string;
  previousState: string | null;
  triggeredBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export interface ClaimResponse {
  success: boolean;
  claim: Claim;
}

export async function getClaim(claimId: string): Promise<ClaimResponse> {
  const { data } = await apiClient.get(`/claims/${claimId}`);
  return data;
}

export async function createClaim(): Promise<ClaimResponse> {
  const { data } = await apiClient.post('/claims', {});
  return data;
}

export async function updateClaim(
  claimId: string,
  claimData: Record<string, unknown>
): Promise<ClaimResponse> {
  const { data } = await apiClient.put(`/claims/${claimId}`, claimData);
  return data;
}

export async function attachDocument(
  claimId: string,
  documentId: string,
  documentRole: string
): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`/claims/${claimId}/documents`, {
    documentId,
    documentRole,
  });
  return data;
}

export async function attachSignatureToClaim(
  claimId: string,
  signatureId: string
): Promise<ClaimResponse> {
  const { data } = await apiClient.post(`/claims/${claimId}/signature`, {
    signatureId,
  });
  return data;
}

export async function submitClaim(
  claimId: string
): Promise<ClaimResponse & { message: string }> {
  const { data } = await apiClient.post(`/claims/${claimId}/submit`);
  return data;
}

// Confirm step: stop the refund application when the user changes one of the
// four Section-1 answers to "Yes". `reasons` are the answer keys that
// triggered the stop. The claim is marked stopped (rejected) and the user is
// emailed; the €199 deposit refund is executed manually by ops.
export async function stopClaim(
  claimId: string,
  reasons: string[]
): Promise<ClaimResponse & { message: string }> {
  const { data } = await apiClient.post(`/claims/${claimId}/stop`, { reasons });
  return data;
}

// ============================================================
// Contract Withdrawal (EU-legal electronic withdrawal)
// ============================================================

export interface WithdrawalContract {
  claimId: string;
  fullName: string;
  email: string;
  pensionTypeOrInstitution: string;
  contractDate: string | null;
  paymentDate: string | null;
  applicationAlreadySubmitted: boolean;
  declarationText: string;
  alreadyWithdrawn: boolean;
}

export interface IdentifyWithdrawalInput {
  fullName: string;
  email: string;
  claimId: string;
  pensionTypeOrInstitution: string;
}

// Public identification. Returns the identified contract on a full match, or
// throws on the generic 404 (never revealing which field failed).
export async function identifyWithdrawal(
  input: IdentifyWithdrawalInput
): Promise<{ success: boolean; contract: WithdrawalContract }> {
  const { data } = await apiClient.post('/withdrawals/identify', input);
  return data;
}

// Second-step confirmation. On the public path pass the identify payload; a
// logged-in owner needs only the claimId (the auth token is attached
// automatically). Withdrawal completes ONLY on this call.
export async function confirmWithdrawal(input: {
  claimId: string;
  fullName?: string;
  email?: string;
  pensionTypeOrInstitution?: string;
}): Promise<{
  success: boolean;
  contract: WithdrawalContract;
  message: string;
}> {
  const { data } = await apiClient.post('/withdrawals/confirm', input);
  return data;
}

export async function markStepComplete(
  claimId: string,
  stepName: string
): Promise<ClaimResponse> {
  const { data } = await apiClient.put(`/claims/${claimId}/steps/${stepName}`, {
    completed: true,
  });
  return data;
}

export async function getUserClaims(): Promise<{
  success: boolean;
  claims: Claim[];
}> {
  const { data } = await apiClient.get('/claims');
  return data;
}

export async function getClaimDocuments(
  claimId: string
): Promise<{ success: boolean; documents: ClaimDocument[] }> {
  const { data } = await apiClient.get(`/claims/${claimId}/documents`);
  return data;
}

export async function getClaimWorkflowHistory(
  claimId: string
): Promise<{ success: boolean; history: WorkflowHistoryEntry[] }> {
  const { data } = await apiClient.get(`/claims/${claimId}/workflow/history`);
  return data;
}

export async function generateClaimPdf(
  claimId: string
): Promise<{ pdfS3Key: string; downloadUrl: string }> {
  const { data } = await apiClient.post(`/claims/${claimId}/generate-pdf`);
  return data.data;
}

export async function getClaimPdfUrl(claimId: string): Promise<string> {
  const { data } = await apiClient.get(`/claims/${claimId}/pdf`);
  return data.data.downloadUrl;
}

// ============================================================
// Payments
// ============================================================

export interface CheckoutSessionResponse {
  success: boolean;
  url: string;
  sessionId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  claimId: string;
  paymentStatus: string;
}

export async function createCheckoutSession(
  claimId: string
): Promise<CheckoutSessionResponse> {
  const { data } = await apiClient.post('/payments/create-checkout-session', {
    claimId,
  });
  return data;
}

export async function verifyPaymentSession(
  sessionId: string
): Promise<VerifyPaymentResponse> {
  const { data } = await apiClient.post('/payments/verify-session', {
    sessionId,
  });
  return data;
}
