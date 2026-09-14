import apiClient from './api';
import type {
  CaseEventEntry,
  CorrespondenceItem,
  LawFirmMembership,
  LawFirmSummary,
} from './law-firm-api';

export type ClaimHandlingRoute = 'direct' | 'law_firm';
export type ClaimPayoutTarget = 'client' | 'law_firm';
export type ClaimPensionType = 'public' | 'private';

export interface ClaimListItem {
  id: string;
  userId: string;
  status: string;
  workflowState: string;
  claimType: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  paymentStatus: string | null;
  pensionType: ClaimPensionType | null;
  handlingRoute: ClaimHandlingRoute;
  lawFirmRef: string | null;
  lawFirmCaseState: string | null;
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
  pdfS3Key: string | null;
  lettershopSubmissionId: string | null;
  // Product + bAV cash-out intake
  pensionType: ClaimPensionType | null;
  salutation: string | null;
  taxId: string | null;
  healthInsuranceEndDate: string | null;
  employerName: string | null;
  employmentEndDate: string | null;
  employerPersonnelNumber: string | null;
  bavProviderName: string | null;
  bavDurchfuehrungsweg: string | null;
  bavContractReferenceLabel: string | null;
  bavContractReference: string | null;
  drvRefundReceived: boolean | null;
  drvOffice: string | null;
  drvDecisionDate: string | null;
  bavStatementType: string | null;
  bavStatementDate: string | null;
  bavBenefitForm: string | null;
  bavBenefitAmount: string | null;
  bavAddresseeType: string | null;
  bavRecipientName: string | null;
  bavRecipientStreet: string | null;
  bavRecipientPostalCode: string | null;
  bavRecipientCity: string | null;
  bavRecipientDepartment: string | null;
  bavRecipientRef: string | null;
  bavProviderFormTitle: string | null;
  // Health insurance (bAV only)
  healthInsuranceType: string | null;
  healthInsuranceProviderName: string | null;
  healthInsuranceProviderAddress: string | null;
  healthInsuranceNumber: string | null;
  // Handling route (ops decision)
  handlingRoute: ClaimHandlingRoute | null;
  handlingRouteSetAt: string | null;
  handlingRouteSetBy: string | null;
  payoutTarget: ClaimPayoutTarget | null;
  lawFirmRef: string | null;
  // Law-firm assignment + the firm's case state (portal)
  lawFirmId: string | null;
  lawFirmAssignedAt: string | null;
  lawFirmCaseState: string | null;
  lawFirmDownloadedAt: string | null;
  lawFirmSubmittedAt: string | null;
  lawFirmSubmissionChannel: string | null;
  lawFirmResponseAt: string | null;
  lawFirmClosedAt: string | null;
  copyPdfS3Key: string | null;
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
  lawFirm: number;
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

export type ClaimSort = 'submittedAt' | 'updatedAt' | 'createdAt';

export async function getClaims(params?: {
  status?: string;
  handlingRoute?: ClaimHandlingRoute;
  pensionType?: ClaimPensionType;
  search?: string;
  sort?: ClaimSort;
  dir?: 'asc' | 'desc';
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

export async function getClaimDetail(id: string): Promise<ClaimDetailResponse> {
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

export interface ClaimRoutingInput {
  handlingRoute: ClaimHandlingRoute;
  payoutTarget?: ClaimPayoutTarget | null;
  lawFirmRef?: string | null;
  note?: string;
}

export async function setClaimRouting(
  id: string,
  input: ClaimRoutingInput
): Promise<ClaimDetail> {
  const { data } = await apiClient.put(`/admin/claims/${id}/routing`, input);
  return data.claim;
}

export async function getPackageDownloadUrl(
  id: string
): Promise<{ pdfS3Key: string; downloadUrl: string | null }> {
  const { data } = await apiClient.get(`/admin/claims/${id}/package`);
  return data;
}

export async function regeneratePackage(id: string): Promise<{
  pdfS3Key: string;
  downloadUrl: string | null;
  templateId: string;
  signer: string;
  copyS3Key: string | null;
  missingPlaceholders: string[];
}> {
  const { data } = await apiClient.post(
    `/admin/claims/${id}/package/regenerate`
  );
  return data;
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

// ============================================================
// Law firm (ops side)
// ============================================================

export async function getClaimCorrespondence(
  id: string
): Promise<{ correspondence: CorrespondenceItem[]; events: CaseEventEntry[] }> {
  const { data } = await apiClient.get(`/admin/claims/${id}/correspondence`);
  return data;
}

export async function getCorrespondenceDownloadUrl(
  claimId: string,
  corrId: string
): Promise<{ downloadUrl: string | null; fileName: string; fileType: string }> {
  const { data } = await apiClient.get(
    `/admin/claims/${claimId}/correspondence/${corrId}/download`
  );
  return data;
}

export async function getLawFirms(): Promise<LawFirmSummary[]> {
  const { data } = await apiClient.get('/admin/law-firms');
  return data.firms;
}

export interface LawFirmMemberRow extends LawFirmMembership {
  email: string;
  firstName: string | null;
  lastName: string | null;
  invitedBy: string | null;
}

export async function getLawFirmMembers(
  firmId: string
): Promise<{ firm: LawFirmSummary; members: LawFirmMemberRow[] }> {
  const { data } = await apiClient.get(`/admin/law-firms/${firmId}/members`);
  return data;
}

export async function inviteLawFirmMember(
  firmId: string,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    role?: 'member' | 'firm_admin';
  }
): Promise<LawFirmMembership & { email: string; magicLinkUrl?: string }> {
  const { data } = await apiClient.post(
    `/admin/law-firms/${firmId}/members`,
    input
  );
  return data.member;
}

export async function removeLawFirmMember(
  firmId: string,
  memberId: string
): Promise<void> {
  await apiClient.delete(`/admin/law-firms/${firmId}/members/${memberId}`);
}

// ============================================================
// Ops home
// ============================================================

export interface AttentionItem {
  id: string;
  claimantName: string | null;
  email: string | null;
  pensionType: string | null;
  status: string | null;
  handlingRoute: string;
  lawFirmCaseState: string | null;
  lawFirmRef: string | null;
  paymentStatus: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  ageDays: number;
}

export interface ActivityItem {
  id: string;
  claimId: string;
  claimantName: string | null;
  state: string;
  previousState: string | null;
  triggeredBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export interface AdminOverview {
  attention: {
    submitted: AttentionItem[];
    responses: AttentionItem[];
    missingPackage: AttentionItem[];
    paymentIssues: AttentionItem[];
  };
  activity: ActivityItem[];
  counts: {
    submitted: number;
    processing: number;
    lawFirm: number;
    completedThisWeek: number;
  };
}

export async function getOverview(): Promise<AdminOverview> {
  const { data } = await apiClient.get('/admin/overview');
  return data;
}
