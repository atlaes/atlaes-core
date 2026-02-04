import apiClient from './api';

// Types matching backend schema
export type ClaimType = 'own_refund' | 'surviving_spouse';

// Nested structures for UI convenience
export interface CurrentAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface LastGermanAddress {
  streetAddress?: string;
  city?: string;
  postalCode?: string;
}

export interface BankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  bsb?: string;
  swiftBic?: string;
  iban?: string;
  bankStreet?: string;
  bankCity?: string;
  bankPostalCode?: string;
  bankCountry?: string;
}

export type ClaimStatus = 'draft' | 'ready' | 'submitted' | 'processing' | 'completed' | 'rejected';

export type ClaimWorkflowState =
  | 'personal_info'
  | 'documents'
  | 'payment_details'
  | 'signature'
  | 'id_verification'
  | 'review'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'rejected';

export type ClaimStepName =
  | 'claimType'
  | 'passportUpload'
  | 'currentAddress'
  | 'germanSocialInsurance'
  | 'lastAddressInGermany'
  | 'bankDetails'
  | 'signDocuments'
  | 'identityConfirmationForm'
  | 'reviewInformation'
  | 'finalConfirmation';

export type ClaimDocumentRole = 'passport' | 'payslip' | 'abmeldung' | 'bank_statement' | 'certified_id_form';

export type CertifyingAuthority =
  | 'notary_public'
  | 'local_government'
  | 'bank_branch'
  | 'police'
  | 'embassy'
  | 'justice_of_peace';

export type AbmeldungMethod = 'uploaded' | 'manual' | 'service_requested';

export interface Claim {
  id: string;
  userId: string;
  applicationId?: string;

  // Status & Workflow
  status: ClaimStatus;
  workflowState: ClaimWorkflowState;
  completedSteps: Record<ClaimStepName, boolean>;

  // Claim Type
  claimType?: ClaimType;

  // Personal Information (Passport)
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  placeOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;

  // Current Address
  currentAddressLine1?: string;
  currentAddressLine2?: string;
  currentCity?: string;
  currentPostalCode?: string;
  currentCountry?: string;

  // German Social Insurance
  svNummer?: string;

  // Last German Address
  germanStreet?: string;
  germanPostalCode?: string;
  germanCity?: string;
  moveOutDate?: string;
  abmeldungMethod?: AbmeldungMethod;
  deregistrationServiceRequested?: boolean;

  // Bank Details
  preferredCurrency?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  bsb?: string;
  swiftBic?: string;
  iban?: string;
  bankStreet?: string;
  bankCity?: string;
  bankPostalCode?: string;
  bankCountry?: string;

  // Signature
  signatureId?: string;
  signatureCompletedAt?: string;

  // ID Verification
  identityFormDownloadedAt?: string;
  certifyingAuthority?: CertifyingAuthority;
  identityVerifiedAt?: string;

  // Confirmations
  confirmationAccuracyAccepted?: boolean;
  confirmationAuthorizationAccepted?: boolean;

  // Payment
  paymentStatus?: string;
  serviceFee?: string;

  // Submission
  submittedAt?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Nested structures (computed from flat fields)
  currentAddress?: CurrentAddress;
  lastGermanAddress?: LastGermanAddress;
  bankDetails?: BankDetails;
  germanSocialInsuranceNumber?: string; // alias for svNummer
  signatureAuthority?: CertifyingAuthority; // alias for certifyingAuthority
  idVerificationAuthority?: CertifyingAuthority; // also uses certifyingAuthority
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  documentId: string;
  documentRole: ClaimDocumentRole;
  document?: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    s3Key: string;
    url?: string;
  };
  createdAt: string;
  // Convenience accessors (computed)
  fileName?: string;
  fileUrl?: string;
}

// OCR extracted passport data
export interface PassportOCRData {
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
}

export interface UploadDocumentResult {
  claimDocument: ClaimDocument;
  ocr?: PassportOCRData | null;
}

export interface CreateClaimRequest {
  applicationId?: string;
}

// Flat update request (matches API)
export interface UpdateClaimRequestFlat {
  claimType?: ClaimType;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  placeOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  currentAddressLine1?: string;
  currentAddressLine2?: string;
  currentCity?: string;
  currentPostalCode?: string;
  currentCountry?: string;
  svNummer?: string;
  germanStreet?: string;
  germanPostalCode?: string;
  germanCity?: string;
  moveOutDate?: string;
  abmeldungMethod?: AbmeldungMethod;
  deregistrationServiceRequested?: boolean;
  preferredCurrency?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  bsb?: string;
  swiftBic?: string;
  iban?: string;
  bankStreet?: string;
  bankCity?: string;
  bankPostalCode?: string;
  bankCountry?: string;
  certifyingAuthority?: CertifyingAuthority;
  confirmationAccuracyAccepted?: boolean;
  confirmationAuthorizationAccepted?: boolean;
}

// Nested update request (for UI convenience)
export interface UpdateClaimRequest extends UpdateClaimRequestFlat {
  // Nested structures - will be flattened before API call
  currentAddress?: CurrentAddress;
  lastGermanAddress?: LastGermanAddress;
  bankDetails?: BankDetails;
  germanSocialInsuranceNumber?: string;
  signatureAuthority?: CertifyingAuthority;
  idVerificationAuthority?: CertifyingAuthority;
}

export interface ValidationResult {
  isValid: boolean;
  missingSteps: ClaimStepName[];
  missingFields: string[];
  errors: string[];
}

// Transform flat API response to include nested structures
function transformClaimResponse(claim: Claim): Claim {
  return {
    ...claim,
    currentAddress: {
      addressLine1: claim.currentAddressLine1,
      addressLine2: claim.currentAddressLine2,
      city: claim.currentCity,
      postalCode: claim.currentPostalCode,
      country: claim.currentCountry,
    },
    lastGermanAddress: {
      streetAddress: claim.germanStreet,
      city: claim.germanCity,
      postalCode: claim.germanPostalCode,
    },
    bankDetails: {
      accountHolderName: claim.accountHolderName,
      bankName: claim.bankName,
      accountNumber: claim.accountNumber,
      bsb: claim.bsb,
      swiftBic: claim.swiftBic,
      iban: claim.iban,
      bankStreet: claim.bankStreet,
      bankCity: claim.bankCity,
      bankPostalCode: claim.bankPostalCode,
      bankCountry: claim.bankCountry,
    },
    germanSocialInsuranceNumber: claim.svNummer,
    signatureAuthority: claim.certifyingAuthority,
    idVerificationAuthority: claim.certifyingAuthority,
  };
}

// Transform document to include convenience accessors
function transformDocumentResponse(doc: ClaimDocument): ClaimDocument {
  return {
    ...doc,
    fileName: doc.document?.filename,
    fileUrl: doc.document?.url,
  };
}

// Flatten nested update request for API
function flattenUpdateRequest(data: UpdateClaimRequest): UpdateClaimRequestFlat {
  const flat: UpdateClaimRequestFlat = { ...data };

  // Flatten currentAddress
  if (data.currentAddress) {
    flat.currentAddressLine1 = data.currentAddress.addressLine1;
    flat.currentAddressLine2 = data.currentAddress.addressLine2;
    flat.currentCity = data.currentAddress.city;
    flat.currentPostalCode = data.currentAddress.postalCode;
    flat.currentCountry = data.currentAddress.country;
  }

  // Flatten lastGermanAddress
  if (data.lastGermanAddress) {
    flat.germanStreet = data.lastGermanAddress.streetAddress;
    flat.germanCity = data.lastGermanAddress.city;
    flat.germanPostalCode = data.lastGermanAddress.postalCode;
  }

  // Flatten bankDetails
  if (data.bankDetails) {
    flat.accountHolderName = data.bankDetails.accountHolderName;
    flat.bankName = data.bankDetails.bankName;
    flat.accountNumber = data.bankDetails.accountNumber;
    flat.bsb = data.bankDetails.bsb;
    flat.swiftBic = data.bankDetails.swiftBic;
    flat.iban = data.bankDetails.iban;
    flat.bankStreet = data.bankDetails.bankStreet;
    flat.bankCity = data.bankDetails.bankCity;
    flat.bankPostalCode = data.bankDetails.bankPostalCode;
    flat.bankCountry = data.bankDetails.bankCountry;
  }

  // Map aliases
  if (data.germanSocialInsuranceNumber !== undefined) {
    flat.svNummer = data.germanSocialInsuranceNumber;
  }
  if (data.signatureAuthority !== undefined) {
    flat.certifyingAuthority = data.signatureAuthority;
  }
  if (data.idVerificationAuthority !== undefined) {
    flat.certifyingAuthority = data.idVerificationAuthority;
  }

  // Remove nested properties from flat object
  delete (flat as UpdateClaimRequest).currentAddress;
  delete (flat as UpdateClaimRequest).lastGermanAddress;
  delete (flat as UpdateClaimRequest).bankDetails;
  delete (flat as UpdateClaimRequest).germanSocialInsuranceNumber;
  delete (flat as UpdateClaimRequest).signatureAuthority;
  delete (flat as UpdateClaimRequest).idVerificationAuthority;

  return flat;
}

// Claims API functions
export const claimsApi = {
  // Create a new claim
  async createClaim(data?: CreateClaimRequest): Promise<Claim> {
    const response = await apiClient.post('/claims', data || {});
    return transformClaimResponse(response.data.claim);
  },

  // Get all claims for current user
  async getClaims(): Promise<Claim[]> {
    const response = await apiClient.get('/claims');
    return response.data.claims.map(transformClaimResponse);
  },

  // Get a single claim by ID
  async getClaim(claimId: string): Promise<Claim> {
    const response = await apiClient.get(`/claims/${claimId}`);
    return transformClaimResponse(response.data.claim);
  },

  // Update claim fields
  async updateClaim(claimId: string, data: UpdateClaimRequest): Promise<Claim> {
    const flatData = flattenUpdateRequest(data);
    const response = await apiClient.put(`/claims/${claimId}`, flatData);
    return transformClaimResponse(response.data.claim);
  },

  // Delete a draft claim
  async deleteClaim(claimId: string): Promise<void> {
    await apiClient.delete(`/claims/${claimId}`);
  },

  // Mark a step as complete/incomplete
  async updateStepCompletion(
    claimId: string,
    stepName: ClaimStepName,
    completed: boolean
  ): Promise<Claim> {
    const response = await apiClient.put(`/claims/${claimId}/steps/${stepName}`, {
      completed,
    });
    return transformClaimResponse(response.data.claim);
  },

  // Get step completion status
  async getSteps(claimId: string): Promise<Record<ClaimStepName, boolean>> {
    const response = await apiClient.get(`/claims/${claimId}/steps`);
    return response.data.steps;
  },

  // Upload a document (two-step process: upload file, then attach to claim)
  // Returns both the claimDocument and OCR data (if available for passport)
  async uploadDocument(
    claimId: string,
    file: File,
    role: ClaimDocumentRole
  ): Promise<UploadDocumentResult> {
    // Step 1: Upload file to documents service
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', role);

    const uploadResponse = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const documentId = uploadResponse.data.document.id;
    const ocrData = uploadResponse.data.ocr; // OCR data from passport parsing

    // Step 2: Attach the document to the claim
    const attachResponse = await apiClient.post(`/claims/${claimId}/documents`, {
      documentId,
      documentRole: role,
    });

    return {
      claimDocument: transformDocumentResponse(attachResponse.data.claimDocument),
      ocr: ocrData || null,
    };
  },

  // Get claim documents
  async getDocuments(claimId: string): Promise<ClaimDocument[]> {
    const response = await apiClient.get(`/claims/${claimId}/documents`);
    return response.data.documents.map(transformDocumentResponse);
  },

  // Remove a document
  async removeDocument(claimId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/claims/${claimId}/documents/${documentId}`);
  },

  // Attach signature
  async attachSignature(claimId: string, signatureData: string): Promise<Claim> {
    const response = await apiClient.post(`/claims/${claimId}/signature`, {
      signatureData,
    });
    return transformClaimResponse(response.data.claim);
  },

  // Record identity form download
  async recordIdentityFormDownload(claimId: string): Promise<Claim> {
    const response = await apiClient.post(`/claims/${claimId}/identity-form-downloaded`);
    return transformClaimResponse(response.data.claim);
  },

  // Transition workflow state
  async transitionWorkflow(
    claimId: string,
    targetState: ClaimWorkflowState
  ): Promise<Claim> {
    const response = await apiClient.post(`/claims/${claimId}/workflow`, {
      targetState,
    });
    return transformClaimResponse(response.data.claim);
  },

  // Validate claim for submission
  async validateClaim(claimId: string): Promise<ValidationResult> {
    const response = await apiClient.get(`/claims/${claimId}/validate`);
    return response.data;
  },

  // Submit claim
  async submitClaim(claimId: string): Promise<Claim> {
    const response = await apiClient.post(`/claims/${claimId}/submit`);
    return transformClaimResponse(response.data.claim);
  },
};

export default claimsApi;
