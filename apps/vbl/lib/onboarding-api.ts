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

export async function requestMagicLink(email: string): Promise<MagicLinkResponse> {
  const { data } = await apiClient.post('/auth/magic-link/request', { email });
  return data;
}

export async function verifyMagicLink(token: string): Promise<VerifyMagicLinkResponse> {
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
    fullName: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    passportNumber: string;
    expiryDate: string;
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
  const { data } = await apiClient.post('/signatures/upload', { signatureData });
  return data;
}

// ============================================================
// Claims
// ============================================================

export interface ClaimResponse {
  success: boolean;
  claim: {
    id: string;
    userId: string;
    status: string;
    workflowState: string;
    createdAt: string;
    updatedAt: string;
    submittedAt?: string;
    [key: string]: unknown;
  };
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
