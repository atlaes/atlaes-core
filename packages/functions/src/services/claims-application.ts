import { eq, and, sql, count, desc } from 'drizzle-orm';
import { db } from '../utils/db';
import {
  claimsTable,
  claimDocuments,
  claimWorkflowStates,
  ClaimStepName,
  ClaimWorkflowState,
  ClaimStatus,
  ClaimDocumentRole,
  CertifyingAuthority,
  PensionType,
  Salutation,
  BavDurchfuehrungsweg,
  BavStatementType,
  BavBenefitForm,
  BavAddresseeType,
  ClaimHandlingRoute,
  defaultHandlingRoute,
  ClaimPayoutTarget,
  ClaimCaseType,
  MULTI_DOCUMENT_ROLES,
  caseTypeForPensionType,
  deriveCaseTypeOnCreate,
  resolveCaseType,
} from '../drizzle/schema/claims';
import { validateBavIntake } from './bav-letters/intake-validation';
import {
  buildBavPayoutRecord,
  summarizeSettlementList,
  type BavPayoutInput,
  type BavPayoutRecord,
  type SettlementList,
  type SettlementListRow,
} from './bav-letters/payout';
import {
  BavProviderService,
  providerAddressPatch,
  type RecipientPatch,
} from './bav-letters/providers';
import { randomUUID } from 'crypto';
import { deleteFile, uploadFile } from '../utils/s3';
import {
  auditLogs,
  documents,
  users,
  profiles,
} from '../drizzle/schema/shared';
import { logger, toErrorMeta } from '../utils/logger';

// Types for completed steps tracking
export interface CompletedSteps {
  claimType?: boolean;
  passportUpload?: boolean;
  currentAddress?: boolean;
  germanSocialInsurance?: boolean;
  lastAddressInGermany?: boolean;
  healthInsurance?: boolean;
  employment?: boolean;
  cashOutBasis?: boolean;
  bankDetails?: boolean;
  signDocuments?: boolean;
  identityConfirmationForm?: boolean;
  reviewInformation?: boolean;
  finalConfirmation?: boolean;
}

// Types for claim data
export interface ClaimPersonalInfo {
  claimType?: 'own_refund' | 'surviving_spouse';
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  placeOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
}

export interface ClaimCurrentAddress {
  currentAddressLine1?: string;
  currentAddressLine2?: string;
  currentCity?: string;
  currentPostalCode?: string;
  currentCountry?: string;
}

export interface ClaimGermanAddress {
  germanStreet?: string;
  germanPostalCode?: string;
  germanCity?: string;
  moveOutDate?: string;
  abmeldungMethod?: 'uploaded' | 'manual' | 'service_requested';
  deregistrationServiceRequested?: boolean;
}

// Task 15: Health Insurance (bAV/private pension type only)
export interface ClaimHealthInsurance {
  healthInsuranceType?: 'statutory' | 'private' | 'not_sure';
  healthInsuranceProviderName?: string;
  healthInsuranceProviderAddress?: string;
  healthInsuranceInsuredSinceMonth?: string;
  healthInsuranceInsuredSinceYear?: string;
  healthInsurancePlaceOfBirth?: string;
  healthInsuranceCountryOfBirth?: string;
  healthInsuranceNumber?: string;
}

export interface ClaimBankDetails {
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
}

// bAV cash-out intake (pensionType = 'private'). Mirrors the bAV column
// block in drizzle/schema/claims.ts; see the comments there for the letter
// placeholder each field feeds.
export interface ClaimBavDetails {
  pensionType?: PensionType;
  salutation?: Salutation;
  taxId?: string;
  healthInsuranceEndDate?: string;
  employerName?: string;
  employmentEndDate?: string;
  employerPersonnelNumber?: string;
  bavProviderName?: string;
  bavDurchfuehrungsweg?: BavDurchfuehrungsweg;
  bavContractReferenceLabel?: string;
  bavContractReference?: string;
  bavProviderFormTitle?: string;
  drvRefundReceived?: boolean;
  drvOffice?: string;
  drvDecisionDate?: string;
  bavStatementType?: BavStatementType;
  bavStatementDate?: string;
  bavBenefitForm?: BavBenefitForm;
  bavBenefitAmount?: string;
  bavAddresseeType?: BavAddresseeType;
  bavRecipientName?: string;
  bavRecipientDepartment?: string;
  bavRecipientStreet?: string;
  bavRecipientPostalCode?: string;
  bavRecipientCity?: string;
  bavRecipientRef?: string;
}

export interface ClaimData
  extends
    ClaimPersonalInfo,
    ClaimCurrentAddress,
    ClaimGermanAddress,
    ClaimHealthInsurance,
    ClaimBavDetails,
    ClaimBankDetails {
  svNummer?: string;
  certifyingAuthority?: CertifyingAuthority;
  confirmationAccuracyAccepted?: boolean;
  confirmationAuthorizationAccepted?: boolean;
}

export interface Claim {
  id: string;
  userId: string;
  applicationId: string | null;
  /** Product discriminator (see ClaimCaseType); resolved for legacy rows. */
  caseType: ClaimCaseType;
  status: ClaimStatus;
  workflowState: ClaimWorkflowState;
  completedSteps: CompletedSteps;

  // Personal Info
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

  // Current Address
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentCity: string | null;
  currentPostalCode: string | null;
  currentCountry: string | null;

  // German Social Insurance
  svNummer: string | null;

  // German Address
  germanStreet: string | null;
  germanPostalCode: string | null;
  germanCity: string | null;
  moveOutDate: string | null;
  abmeldungMethod: string | null;
  deregistrationServiceRequested: boolean | null;

  // Health Insurance (Task 15, bAV/private pension type only)
  healthInsuranceType: string | null;
  healthInsuranceProviderName: string | null;
  healthInsuranceProviderAddress: string | null;
  healthInsuranceInsuredSinceMonth: string | null;
  healthInsuranceInsuredSinceYear: string | null;
  healthInsurancePlaceOfBirth: string | null;
  healthInsuranceCountryOfBirth: string | null;
  healthInsuranceNumber: string | null;

  // Product discriminator + bAV cash-out intake
  pensionType: string | null;
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
  bavProviderFormTitle: string | null;
  drvRefundReceived: boolean | null;
  drvOffice: string | null;
  drvDecisionDate: string | null;
  bavStatementType: string | null;
  bavStatementDate: string | null;
  bavBenefitForm: string | null;
  bavBenefitAmount: string | null;
  bavAddresseeType: string | null;
  bavRecipientName: string | null;
  bavRecipientDepartment: string | null;
  bavRecipientStreet: string | null;
  bavRecipientPostalCode: string | null;
  bavRecipientCity: string | null;
  bavRecipientRef: string | null;

  // Bank Details
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

  // Signature
  signatureId: string | null;
  signatureCompletedAt: Date | null;

  // ID Verification
  identityFormDownloadedAt: Date | null;
  certifyingAuthority: string | null;
  identityVerifiedAt: Date | null;

  // Confirmations
  confirmationAccuracyAccepted: boolean | null;
  confirmationAuthorizationAccepted: boolean | null;

  // Payment
  paymentStatus: string | null;
  stripePaymentId: string | null;
  paidAt: Date | null;
  serviceFee: string | null;

  // Submission
  submittedAt: Date | null;

  // Combined claim PDF
  pdfS3Key: string | null;
  lettershopSubmissionId: string | null;

  // Handling route (ops decision)
  handlingRoute: string | null;
  handlingRouteSetAt: Date | null;
  handlingRouteSetBy: string | null;
  payoutTarget: string | null;
  lawFirmRef: string | null;

  // Law-firm assignment + the firm's case state (portal)
  lawFirmId: string | null;
  lawFirmAssignedAt: Date | null;
  lawFirmCaseState: string | null;
  lawFirmDownloadedAt: Date | null;
  lawFirmSubmittedAt: Date | null;
  lawFirmSubmissionChannel: string | null;
  lawFirmResponseAt: Date | null;
  lawFirmClosedAt: Date | null;

  // bAV payout on the Anderkonto (see recordBavPayout)
  bavPayoutAmount: string | null;
  bavPayoutValueDate: string | null;
  bavFeeEur: string | null;
  bavLawFirmFeeDeducted: boolean | null;
  bavSettlementList: boolean | null;
  bavPayoutRecordedAt: Date | null;
  bavPayoutRecordedBy: string | null;
  copyPdfS3Key: string | null;

  // Timestamps
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  documentId: string;
  documentRole: ClaimDocumentRole;
  createdAt: Date | null;
  document?: {
    id: string;
    fileName: string;
    fileType: string;
    s3Key: string;
    status: string | null;
  };
}

export interface WorkflowStateEntry {
  id: string;
  claimId: string;
  state: string;
  previousState: string | null;
  triggeredBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date | null;
}

export interface ValidationResult {
  isValid: boolean;
  missingSteps: ClaimStepName[];
  errors: string[];
}

// Helper function to map database row to Claim type
function mapRowToClaim(row: any): Claim {
  const caseType = resolveCaseType(row);
  return {
    id: row.id,
    userId: row.userId,
    applicationId: row.applicationId,
    caseType,
    status: (row.status || 'draft') as ClaimStatus,
    workflowState: (row.workflowState || 'personal_info') as ClaimWorkflowState,
    completedSteps: (row.completedSteps || {}) as CompletedSteps,
    claimType: row.claimType,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    placeOfBirth: row.placeOfBirth,
    nationality: row.nationality,
    passportNumber: row.passportNumber,
    passportIssueDate: row.passportIssueDate,
    passportExpiryDate: row.passportExpiryDate,
    currentAddressLine1: row.currentAddressLine1,
    currentAddressLine2: row.currentAddressLine2,
    currentCity: row.currentCity,
    currentPostalCode: row.currentPostalCode,
    currentCountry: row.currentCountry,
    svNummer: row.svNummer,
    germanStreet: row.germanStreet,
    germanPostalCode: row.germanPostalCode,
    germanCity: row.germanCity,
    moveOutDate: row.moveOutDate,
    abmeldungMethod: row.abmeldungMethod,
    deregistrationServiceRequested: row.deregistrationServiceRequested,
    healthInsuranceType: row.healthInsuranceType,
    healthInsuranceProviderName: row.healthInsuranceProviderName,
    healthInsuranceProviderAddress: row.healthInsuranceProviderAddress,
    healthInsuranceInsuredSinceMonth: row.healthInsuranceInsuredSinceMonth,
    healthInsuranceInsuredSinceYear: row.healthInsuranceInsuredSinceYear,
    healthInsurancePlaceOfBirth: row.healthInsurancePlaceOfBirth,
    healthInsuranceCountryOfBirth: row.healthInsuranceCountryOfBirth,
    healthInsuranceNumber: row.healthInsuranceNumber,
    pensionType: row.pensionType ?? null,
    salutation: row.salutation ?? null,
    taxId: row.taxId ?? null,
    healthInsuranceEndDate: row.healthInsuranceEndDate ?? null,
    employerName: row.employerName ?? null,
    employmentEndDate: row.employmentEndDate ?? null,
    employerPersonnelNumber: row.employerPersonnelNumber ?? null,
    bavProviderName: row.bavProviderName ?? null,
    bavDurchfuehrungsweg: row.bavDurchfuehrungsweg ?? null,
    bavContractReferenceLabel: row.bavContractReferenceLabel ?? null,
    bavContractReference: row.bavContractReference ?? null,
    bavProviderFormTitle: row.bavProviderFormTitle ?? null,
    drvRefundReceived: row.drvRefundReceived ?? null,
    drvOffice: row.drvOffice ?? null,
    drvDecisionDate: row.drvDecisionDate ?? null,
    bavStatementType: row.bavStatementType ?? null,
    bavStatementDate: row.bavStatementDate ?? null,
    bavBenefitForm: row.bavBenefitForm ?? null,
    bavBenefitAmount: row.bavBenefitAmount ?? null,
    bavAddresseeType: row.bavAddresseeType ?? null,
    bavRecipientName: row.bavRecipientName ?? null,
    bavRecipientDepartment: row.bavRecipientDepartment ?? null,
    bavRecipientStreet: row.bavRecipientStreet ?? null,
    bavRecipientPostalCode: row.bavRecipientPostalCode ?? null,
    bavRecipientCity: row.bavRecipientCity ?? null,
    bavRecipientRef: row.bavRecipientRef ?? null,
    preferredCurrency: row.preferredCurrency,
    accountHolderName: row.accountHolderName,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    bsb: row.bsb,
    swiftBic: row.swiftBic,
    iban: row.iban,
    bankStreet: row.bankStreet,
    bankCity: row.bankCity,
    bankPostalCode: row.bankPostalCode,
    bankCountry: row.bankCountry,
    signatureId: row.signatureId,
    signatureCompletedAt: row.signatureCompletedAt,
    identityFormDownloadedAt: row.identityFormDownloadedAt,
    certifyingAuthority: row.certifyingAuthority,
    identityVerifiedAt: row.identityVerifiedAt,
    confirmationAccuracyAccepted: row.confirmationAccuracyAccepted,
    confirmationAuthorizationAccepted: row.confirmationAuthorizationAccepted,
    paymentStatus: row.paymentStatus,
    stripePaymentId: row.stripePaymentId,
    paidAt: row.paidAt,
    serviceFee: row.serviceFee,
    submittedAt: row.submittedAt,
    pdfS3Key: row.pdfS3Key,
    lettershopSubmissionId: row.lettershopSubmissionId ?? null,
    handlingRoute: row.handlingRoute ?? defaultHandlingRoute(caseType),
    handlingRouteSetAt: row.handlingRouteSetAt ?? null,
    handlingRouteSetBy: row.handlingRouteSetBy ?? null,
    payoutTarget: row.payoutTarget ?? null,
    lawFirmRef: row.lawFirmRef ?? null,
    lawFirmId: row.lawFirmId ?? null,
    lawFirmAssignedAt: row.lawFirmAssignedAt ?? null,
    lawFirmCaseState: row.lawFirmCaseState ?? null,
    lawFirmDownloadedAt: row.lawFirmDownloadedAt ?? null,
    lawFirmSubmittedAt: row.lawFirmSubmittedAt ?? null,
    lawFirmSubmissionChannel: row.lawFirmSubmissionChannel ?? null,
    lawFirmResponseAt: row.lawFirmResponseAt ?? null,
    lawFirmClosedAt: row.lawFirmClosedAt ?? null,
    bavPayoutAmount: row.bavPayoutAmount ?? null,
    bavPayoutValueDate: row.bavPayoutValueDate ?? null,
    bavFeeEur: row.bavFeeEur ?? null,
    bavLawFirmFeeDeducted: row.bavLawFirmFeeDeducted ?? null,
    bavSettlementList: row.bavSettlementList ?? null,
    bavPayoutRecordedAt: row.bavPayoutRecordedAt ?? null,
    bavPayoutRecordedBy: row.bavPayoutRecordedBy ?? null,
    copyPdfS3Key: row.copyPdfS3Key ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function calculateAge(dateOfBirth: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  let age = today.getUTCFullYear() - year;
  const birthdayThisYear = new Date(
    Date.UTC(today.getUTCFullYear(), month - 1, day)
  );

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age;
}

export class ClaimsApplicationService {
  /**
   * Create a new claim for a user. `caseType` defaults from the
   * application link (GPR → drv_refund) else vbl_refund; the VBL app's
   * pensionType 'private' later turns that into bav_cashout (updateClaim).
   */
  static async createClaim(
    userId: string,
    applicationId?: string,
    caseType?: ClaimCaseType,
    attribution?: Record<string, unknown> | null
  ): Promise<Claim> {
    try {
      const resolvedCaseType =
        caseType ?? deriveCaseTypeOnCreate({ applicationId });
      const result = await db.transaction(async (tx: any) => {
        // Create the claim
        const [newClaim] = await tx
          .insert(claimsTable)
          .values({
            userId,
            applicationId: applicationId || null,
            caseType: resolvedCaseType,
            attribution: attribution ?? null,
            status: 'draft',
            workflowState: 'personal_info',
            completedSteps: {},
            workflowHistory: [
              {
                state: 'personal_info',
                timestamp: new Date().toISOString(),
                triggeredBy: 'user',
                note: 'Claim created',
              },
            ],
          })
          .returning();

        // Create initial workflow state
        await tx.insert(claimWorkflowStates).values({
          claimId: newClaim.id,
          state: 'personal_info',
          previousState: null,
          triggeredBy: 'user',
          metadata: { source: 'claim_creation', applicationId },
        });

        // Log the creation
        await tx.insert(auditLogs).values({
          userId,
          action: 'claim_created',
          resource: 'claim',
          resourceId: newClaim.id,
          details: { applicationId, caseType: resolvedCaseType },
        });

        return newClaim;
      });

      logger.info(`Claim created for user: ${userId}, claim: ${result.id}`);
      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error creating claim:', toErrorMeta(error));
      throw new Error('Failed to create claim');
    }
  }

  /**
   * Get a claim by ID with ownership verification
   */
  static async getClaim(
    claimId: string,
    userId: string
  ): Promise<Claim | null> {
    try {
      const result = await db
        .select()
        .from(claimsTable)
        .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return mapRowToClaim(result[0]);
    } catch (error) {
      logger.error('Error getting claim:', error);
      throw new Error('Failed to get claim');
    }
  }

  /**
   * Get all claims for a user
   */
  static async getUserClaims(userId: string): Promise<Claim[]> {
    try {
      const result = await db
        .select()
        .from(claimsTable)
        .where(eq(claimsTable.userId, userId))
        .orderBy(sql`${claimsTable.createdAt} DESC`);

      return result.map(mapRowToClaim);
    } catch (error) {
      logger.error('Error getting user claims:', error);
      throw new Error('Failed to get user claims');
    }
  }

  /**
   * Update a claim
   */
  static async updateClaim(
    claimId: string,
    userId: string,
    data: Partial<ClaimData>
  ): Promise<Claim | null> {
    try {
      // Verify ownership first
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        return null;
      }

      // Don't allow updates to submitted claims
      if (
        existing.status === 'submitted' ||
        existing.status === 'processing' ||
        existing.status === 'completed'
      ) {
        throw new Error('Cannot update a submitted claim');
      }

      // Keep case_type in step with the legacy pension_type the VBL app
      // saves ('private' → bAV cash-out). DRV refunds never change.
      const caseTypePatch =
        data.pensionType && existing.caseType !== 'drv_refund'
          ? { caseType: caseTypeForPensionType(data.pensionType) }
          : {};

      const result = await db
        .update(claimsTable)
        .set({
          ...data,
          ...caseTypePatch,
          updatedAt: new Date(),
        })
        .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
        .returning();

      if (result.length === 0) {
        return null;
      }

      logger.info(`Claim updated: ${claimId}`);
      return mapRowToClaim(result[0]);
    } catch (error) {
      logger.error('Error updating claim:', error);
      throw error;
    }
  }

  /**
   * Delete a draft claim
   */
  static async deleteClaim(claimId: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership and status
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        return false;
      }

      if (existing.status !== 'draft') {
        throw new Error('Only draft claims can be deleted');
      }

      await db.transaction(async (tx: any) => {
        // Delete related records (cascade should handle this, but be explicit)
        await tx
          .delete(claimDocuments)
          .where(eq(claimDocuments.claimId, claimId));
        await tx
          .delete(claimWorkflowStates)
          .where(eq(claimWorkflowStates.claimId, claimId));

        // Delete the claim
        await tx.delete(claimsTable).where(eq(claimsTable.id, claimId));

        // Log the deletion
        await tx.insert(auditLogs).values({
          userId,
          action: 'claim_deleted',
          resource: 'claim',
          resourceId: claimId,
          details: {},
        });
      });

      logger.info(`Claim deleted: ${claimId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting claim:', error);
      throw error;
    }
  }

  // ==================== STEP COMPLETION TRACKING ====================

  /**
   * Mark a step as complete
   */
  static async markStepComplete(
    claimId: string,
    userId: string,
    step: ClaimStepName
  ): Promise<CompletedSteps> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const updatedSteps: CompletedSteps = {
        ...existing.completedSteps,
        [step]: true,
      };

      await db
        .update(claimsTable)
        .set({
          completedSteps: updatedSteps,
          updatedAt: new Date(),
        })
        .where(
          and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId))
        );

      logger.info(`Step marked complete: ${step} for claim: ${claimId}`);
      return updatedSteps;
    } catch (error) {
      logger.error('Error marking step complete:', error);
      throw error;
    }
  }

  /**
   * Mark a step as incomplete
   */
  static async markStepIncomplete(
    claimId: string,
    userId: string,
    step: ClaimStepName
  ): Promise<CompletedSteps> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const updatedSteps: CompletedSteps = {
        ...existing.completedSteps,
        [step]: false,
      };

      await db
        .update(claimsTable)
        .set({
          completedSteps: updatedSteps,
          updatedAt: new Date(),
        })
        .where(
          and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId))
        );

      logger.info(`Step marked incomplete: ${step} for claim: ${claimId}`);
      return updatedSteps;
    } catch (error) {
      logger.error('Error marking step incomplete:', error);
      throw error;
    }
  }

  /**
   * Get completed steps for a claim
   */
  static async getCompletedSteps(
    claimId: string,
    userId: string
  ): Promise<CompletedSteps> {
    const claim = await this.getClaim(claimId, userId);
    if (!claim) {
      throw new Error('Claim not found');
    }
    return claim.completedSteps;
  }

  // ==================== DOCUMENT MANAGEMENT ====================

  /**
   * Add a document to a claim
   */
  static async addDocument(
    claimId: string,
    userId: string,
    documentId: string,
    role: ClaimDocumentRole
  ): Promise<ClaimDocument> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      // Verify the document belongs to the user
      const [doc] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
        .limit(1);

      if (!doc) {
        throw new Error('Document not found or does not belong to user');
      }

      // Extras are attached by ops (attachExtraDocument), never here.
      if (MULTI_DOCUMENT_ROLES.has(role)) {
        throw new Error(`Document role ${role} is reserved for ops`);
      }

      // Remove any existing document with the same role (replace pattern)
      await db
        .delete(claimDocuments)
        .where(
          and(
            eq(claimDocuments.claimId, claimId),
            eq(claimDocuments.documentRole, role)
          )
        );

      // Add the new document
      const [result] = await db
        .insert(claimDocuments)
        .values({
          claimId,
          documentId,
          documentRole: role,
        })
        .returning();

      logger.info(`Document added to claim: ${claimId}, role: ${role}`);
      return {
        id: result.id,
        claimId: result.claimId,
        documentId: result.documentId,
        documentRole: result.documentRole as ClaimDocumentRole,
        createdAt: result.createdAt,
      };
    } catch (error) {
      logger.error('Error adding document to claim:', error);
      throw error;
    }
  }

  /**
   * Remove a document from a claim
   */
  static async removeDocument(
    claimId: string,
    userId: string,
    documentId: string
  ): Promise<boolean> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const result = await db
        .delete(claimDocuments)
        .where(
          and(
            eq(claimDocuments.claimId, claimId),
            eq(claimDocuments.documentId, documentId)
          )
        )
        .returning();

      logger.info(`Document removed from claim: ${claimId}`);
      return result.length > 0;
    } catch (error) {
      logger.error('Error removing document from claim:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a claim
   */
  static async getClaimDocuments(
    claimId: string,
    userId: string
  ): Promise<ClaimDocument[]> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const result = await db
        .select({
          id: claimDocuments.id,
          claimId: claimDocuments.claimId,
          documentId: claimDocuments.documentId,
          documentRole: claimDocuments.documentRole,
          createdAt: claimDocuments.createdAt,
          document: {
            id: documents.id,
            fileName: documents.fileName,
            fileType: documents.fileType,
            s3Key: documents.s3Key,
            status: documents.status,
          },
        })
        .from(claimDocuments)
        .leftJoin(documents, eq(claimDocuments.documentId, documents.id))
        .where(eq(claimDocuments.claimId, claimId));

      return result.map((row) => ({
        id: row.id,
        claimId: row.claimId,
        documentId: row.documentId,
        documentRole: row.documentRole as ClaimDocumentRole,
        createdAt: row.createdAt,
        document: row.document
          ? {
              id: row.document.id,
              fileName: row.document.fileName,
              fileType: row.document.fileType,
              s3Key: row.document.s3Key,
              status: row.document.status,
            }
          : undefined,
      }));
    } catch (error) {
      logger.error('Error getting claim documents:', error);
      throw error;
    }
  }

  // ==================== SIGNATURE ====================

  /**
   * Attach a signature to a claim
   */
  static async attachSignature(
    claimId: string,
    userId: string,
    signatureId: string
  ): Promise<Claim | null> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const result = await db
        .update(claimsTable)
        .set({
          signatureId,
          signatureCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
        .returning();

      if (result.length === 0) {
        return null;
      }

      logger.info(`Signature attached to claim: ${claimId}`);
      return mapRowToClaim(result[0]);
    } catch (error) {
      logger.error('Error attaching signature:', error);
      throw error;
    }
  }

  // ==================== WORKFLOW ====================

  /**
   * Transition workflow state
   */
  static async transitionState(
    claimId: string,
    userId: string,
    newState: ClaimWorkflowState,
    metadata?: Record<string, unknown>
  ): Promise<Claim | null> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const previousState = existing.workflowState;

      const result = await db.transaction(async (tx: any) => {
        // Update claim
        const [updatedClaim] = await tx
          .update(claimsTable)
          .set({
            workflowState: newState,
            workflowHistory: sql`${claimsTable.workflowHistory} || ${JSON.stringify(
              [
                {
                  state: newState,
                  previousState,
                  timestamp: new Date().toISOString(),
                  triggeredBy: 'user',
                },
              ]
            )}::jsonb`,
            updatedAt: new Date(),
          })
          .where(
            and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId))
          )
          .returning();

        // Record workflow state transition
        await tx.insert(claimWorkflowStates).values({
          claimId,
          state: newState,
          previousState,
          triggeredBy: 'user',
          metadata: metadata || null,
        });

        return updatedClaim;
      });

      logger.info(
        `Claim workflow transitioned: ${claimId} from ${previousState} to ${newState}`
      );
      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error transitioning workflow state:', error);
      throw error;
    }
  }

  /**
   * Get workflow history for a claim
   */
  static async getWorkflowHistory(
    claimId: string,
    userId: string
  ): Promise<WorkflowStateEntry[]> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const result = await db
        .select()
        .from(claimWorkflowStates)
        .where(eq(claimWorkflowStates.claimId, claimId))
        .orderBy(sql`${claimWorkflowStates.createdAt} DESC`);

      return result.map((row) => ({
        id: row.id,
        claimId: row.claimId,
        state: row.state,
        previousState: row.previousState,
        triggeredBy: row.triggeredBy,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting workflow history:', error);
      throw error;
    }
  }

  // ==================== SUBMISSION ====================

  /**
   * Validate a claim for submission
   */
  static async validateForSubmission(
    claimId: string,
    userId: string
  ): Promise<ValidationResult> {
    try {
      const claim = await this.getClaim(claimId, userId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      const missingSteps: ClaimStepName[] = [];
      const errors: string[] = [];

      // Detect if this is a VBL-style claim (own_refund without German address data)
      const isVblClaim =
        claim.claimType === 'own_refund' && !claim.germanStreet;

      // Universal checks — required for all claim types
      if (!claim.firstName) errors.push('First name is required');
      if (!claim.lastName) errors.push('Last name is required');
      if (!claim.dateOfBirth) errors.push('Date of birth is required');
      if (claim.dateOfBirth) {
        const age = calculateAge(claim.dateOfBirth);
        if (age === null) {
          errors.push('Date of birth is invalid');
        } else if (age < 18) {
          errors.push('Applicant must be at least 18 years old');
        }
      }
      if (!claim.nationality) errors.push('Nationality is required');
      if (!claim.placeOfBirth) errors.push('Place of birth is required');
      if (!claim.passportNumber) errors.push('Passport number is required');
      if (!claim.currentAddressLine1)
        errors.push('Current address is required');
      if (!claim.currentCity) errors.push('Current city is required');
      if (!claim.currentCountry) errors.push('Current country is required');
      if (!claim.signatureId) errors.push('Signature is required');

      // Check for passport document (required for all)
      const docs = await this.getClaimDocuments(claimId, userId);
      const hasPassport = docs.some((d) => d.documentRole === 'passport');
      if (!hasPassport) errors.push('Passport document is required');

      // bAV cash-out checks — what the Abfindung letters need for the
      // claim's route (A: DRV refund granted, B: Kleinstanwartschaft).
      if (claim.caseType === 'bav_cashout') {
        errors.push(
          ...validateBavIntake(
            claim,
            docs.map((d) => d.documentRole)
          )
        );
      }

      // GPR-specific checks — only for full GPR claims
      if (!isVblClaim) {
        if (!claim.claimType) errors.push('Claim type is required');
        if (!claim.germanStreet) errors.push('German address is required');
        if (!claim.germanCity) errors.push('German city is required');
        if (!claim.moveOutDate) errors.push('Move out date is required');
        if (!claim.accountHolderName)
          errors.push('Bank account holder name is required');
        if (!claim.bankName) errors.push('Bank name is required');
        if (!claim.confirmationAccuracyAccepted)
          errors.push('Accuracy confirmation is required');
        if (!claim.confirmationAuthorizationAccepted)
          errors.push('Authorization confirmation is required');

        const hasCertifiedId = docs.some(
          (d) => d.documentRole === 'certified_id_form'
        );
        if (!hasCertifiedId) errors.push('Certified identity form is required');

        // Check required steps for GPR
        const requiredSteps: ClaimStepName[] = [
          'claimType',
          'passportUpload',
          'currentAddress',
          'lastAddressInGermany',
          'bankDetails',
          'signDocuments',
          'identityConfirmationForm',
          'reviewInformation',
          'finalConfirmation',
        ];

        for (const step of requiredSteps) {
          if (!claim.completedSteps[step]) {
            missingSteps.push(step);
          }
        }
      }

      return {
        isValid: missingSteps.length === 0 && errors.length === 0,
        missingSteps,
        errors,
      };
    } catch (error) {
      logger.error('Error validating claim:', error);
      throw error;
    }
  }

  /**
   * Submit a claim
   */
  static async submitClaim(claimId: string, userId: string): Promise<Claim> {
    try {
      // bAV: fill the letter address from the provider matrix when the
      // claim has none (non-fatal; validation reports what is still missing).
      try {
        await this.applyProviderAddress(claimId, userId);
      } catch (fillError) {
        logger.warn('Provider address fill failed', {
          claimId,
          error:
            fillError instanceof Error ? fillError.message : String(fillError),
        });
      }

      // Validate first
      const validation = await this.validateForSubmission(claimId, userId);
      if (!validation.isValid) {
        throw new Error(
          `Claim validation failed: ${validation.errors.join(', ')}`
        );
      }

      const result = await db.transaction(async (tx: any) => {
        // Update claim status
        const [updatedClaim] = await tx
          .update(claimsTable)
          .set({
            status: 'submitted',
            workflowState: 'submitted',
            submittedAt: new Date(),
            workflowHistory: sql`${claimsTable.workflowHistory} || ${JSON.stringify(
              [
                {
                  state: 'submitted',
                  timestamp: new Date().toISOString(),
                  triggeredBy: 'user',
                  note: 'Claim submitted by user',
                },
              ]
            )}::jsonb`,
            updatedAt: new Date(),
          })
          .where(
            and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId))
          )
          .returning();

        // Record workflow transition
        await tx.insert(claimWorkflowStates).values({
          claimId,
          state: 'submitted',
          previousState: 'review',
          triggeredBy: 'user',
          metadata: { action: 'user_submission' },
        });

        // Audit log
        await tx.insert(auditLogs).values({
          userId,
          action: 'claim_submitted',
          resource: 'claim',
          resourceId: claimId,
          details: { submittedAt: new Date().toISOString() },
        });

        return updatedClaim;
      });

      logger.info(`Claim submitted: ${claimId}`);

      // bAV cash-out claims get the Abfindung letter package (services/
      // bav-letters), not the VBL L203 package below. Same non-fatal
      // contract: generation or delivery failures are logged, the
      // submission stands, and ops can regenerate from the admin.
      if (resolveCaseType(result) === 'bav_cashout') {
        const handlingRoute =
          result.handlingRoute ?? defaultHandlingRoute(resolveCaseType(result));
        try {
          const { BavLetterPackageService } = await import('./bav-letters');
          const pkg = await BavLetterPackageService.generateAndStoreForClaim(
            claimId,
            userId
          );
          if (handlingRoute === 'law_firm') {
            logger.info(
              'bAV package stored for the law firm; lettershop skipped',
              {
                claimId,
                templateId: pkg.templateId,
              }
            );
          } else {
            try {
              const { LettershopService } = await import('./lettershop');
              await LettershopService.sendClaimPdf(claimId, pkg.bytes, userId);
              if (pkg.copy) {
                await LettershopService.sendClaimPdf(
                  claimId,
                  pkg.copy.bytes,
                  userId,
                  'copy'
                );
              }
            } catch (lettershopError) {
              logger.warn('Failed to submit bAV package to lettershop', {
                claimId,
                error:
                  lettershopError instanceof Error
                    ? lettershopError.message
                    : String(lettershopError),
              });
            }
          }
        } catch (pkgError) {
          logger.warn('Failed to generate bAV package after submission', {
            claimId,
            error:
              pkgError instanceof Error ? pkgError.message : String(pkgError),
          });
        }
        return mapRowToClaim(result);
      }

      // Generate the combined claim PDF after a successful submission.
      // Failure here must NOT roll back or fail the submission — the PDF
      // can be regenerated later via POST /api/claims/:id/generate-pdf.
      // Uses a lazy dynamic import: './claim-pdf' imports
      // ClaimsApplicationService from this module, so a static top-level
      // import here would create a circular import.
      try {
        const { ClaimPdfService } = await import('./claim-pdf');
        const { bytes } = await ClaimPdfService.generateAndStoreForClaim(
          claimId,
          userId
        );

        // Deliver the combined claim PDF to the lettershop provider
        // (onlinebrief24.de) for printing/mailing. Same non-fatal contract
        // as PDF generation above: a lettershop failure must never fail
        // submission. Lazy import avoids a cycle (lettershop.ts imports
        // the claims schema/db, and this module is imported widely).
        // Claims routed to the law firm are NOT mailed: the package stays
        // in S3 for the law firm to pick up and submit themselves.
        try {
          if (
            (result.handlingRoute ??
              defaultHandlingRoute(resolveCaseType(result))) === 'law_firm'
          ) {
            logger.info(
              'Lettershop skipped: claim is handled by the law firm',
              {
                claimId,
              }
            );
          } else {
            const { LettershopService } = await import('./lettershop');
            await LettershopService.sendClaimPdf(claimId, bytes, userId);
          }
        } catch (lettershopError) {
          logger.warn('Failed to submit claim PDF to lettershop', {
            claimId,
            error:
              lettershopError instanceof Error
                ? lettershopError.message
                : String(lettershopError),
          });
        }
      } catch (pdfError) {
        logger.warn('Failed to generate claim PDF after submission', {
          claimId,
          error:
            pdfError instanceof Error ? pdfError.message : String(pdfError),
        });
      }

      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error submitting claim:', error);
      throw error;
    }
  }

  // ==================== CONFIRM-STEP STOP ====================

  /**
   * Stop a refund application from the Confirm step, when the user answers
   * "Yes" to one of the four disqualifying questions.
   *
   * No schema migration is used: the stopped state reuses the existing
   * 'rejected' status/workflow value, disambiguated from an admin rejection by
   * the audit action ('claim_stopped_confirm') and the workflow-state metadata
   * (action: 'confirm_stop', including which question(s) triggered it and the
   * manual-refund signal). No Stripe refund is issued here — the stopped state
   * + audit entry is the ops signal for a manual full €199 deposit refund.
   */
  static async stopClaimFromConfirm(
    claimId: string,
    userId: string,
    reasons: string[]
  ): Promise<Claim | null> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        return null;
      }

      // Only in-progress claims can be stopped this way. A claim that is
      // already submitted/processing/completed/rejected is terminal.
      if (
        existing.status === 'submitted' ||
        existing.status === 'processing' ||
        existing.status === 'completed' ||
        existing.status === 'rejected'
      ) {
        throw new Error(`Cannot stop a claim with status '${existing.status}'`);
      }

      const previousState = existing.workflowState;

      const result = await db.transaction(async (tx: any) => {
        const [updatedClaim] = await tx
          .update(claimsTable)
          .set({
            status: 'rejected',
            workflowState: 'rejected',
            workflowHistory: sql`${claimsTable.workflowHistory} || ${JSON.stringify(
              [
                {
                  state: 'rejected',
                  previousState,
                  timestamp: new Date().toISOString(),
                  triggeredBy: 'user',
                  note: 'Stopped at confirm step (disqualifying answer)',
                },
              ]
            )}::jsonb`,
            updatedAt: new Date(),
          })
          .where(
            and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId))
          )
          .returning();

        await tx.insert(claimWorkflowStates).values({
          claimId,
          state: 'rejected',
          previousState,
          triggeredBy: 'user',
          metadata: {
            action: 'confirm_stop',
            reasons,
            refund: 'manual_deposit_199',
            source: 'confirm_step',
          },
        });

        await tx.insert(auditLogs).values({
          userId,
          action: 'claim_stopped_confirm',
          resource: 'claim',
          resourceId: claimId,
          details: { reasons, refund: 'manual_deposit_199' },
        });

        return updatedClaim;
      });

      logger.info(
        `Claim stopped at confirm step: ${claimId} (reasons: ${reasons.join(', ')})`
      );
      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error stopping claim at confirm step:', error);
      throw error;
    }
  }

  // ==================== ADMIN ====================

  /**
   * Get all claims with optional status filter and pagination (admin only)
   */
  static async getAllClaims(filters: {
    status?: string;
    handlingRoute?: string;
    pensionType?: string;
    caseType?: string;
    search?: string;
    sort?: 'submittedAt' | 'updatedAt' | 'createdAt';
    dir?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ claims: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      const sortColumn =
        filters.sort === 'submittedAt'
          ? claimsTable.submittedAt
          : filters.sort === 'updatedAt'
            ? claimsTable.updatedAt
            : claimsTable.createdAt;
      const orderBy =
        filters.dir === 'asc'
          ? sql`${sortColumn} asc nulls last`
          : desc(sortColumn);

      // Build where clause. A NULL handling_route means "not chosen", so
      // filter on the effective route (bAV and DRV → law firm, VBL direct;
      // same rule as defaultHandlingRoute).
      const conditions = [];
      if (filters.status)
        conditions.push(eq(claimsTable.status, filters.status));
      if (filters.handlingRoute) {
        conditions.push(
          sql`coalesce(${claimsTable.handlingRoute}, case when coalesce(${claimsTable.caseType}, case when ${claimsTable.pensionType} = 'private' then 'bav_cashout' when ${claimsTable.applicationId} is not null then 'drv_refund' else 'vbl_refund' end) in ('bav_cashout', 'drv_refund') then 'law_firm' else 'direct' end) = ${filters.handlingRoute}`
        );
      }
      if (filters.pensionType) {
        conditions.push(eq(claimsTable.pensionType, filters.pensionType));
      }
      if (filters.caseType) {
        conditions.push(eq(claimsTable.caseType, filters.caseType));
      }
      // Search by claimant name, account email or the law firm's file number.
      const search = filters.search?.trim();
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(
          sql`(
            concat(coalesce(${claimsTable.firstName}, ''), ' ', coalesce(${claimsTable.lastName}, '')) ILIKE ${pattern}
            OR ${users.email} ILIKE ${pattern}
            OR coalesce(${claimsTable.lawFirmRef}, '') ILIKE ${pattern}
            OR ${claimsTable.id}::text ILIKE ${pattern}
          )`
        );
      }
      const whereClause = conditions.length ? and(...conditions) : undefined;

      // Get total count (joined so the email search applies here too)
      const [countResult] = await db
        .select({ value: count() })
        .from(claimsTable)
        .leftJoin(users, eq(claimsTable.userId, users.id))
        .where(whereClause);
      const total = countResult?.value || 0;

      // Get claims with user info
      const result = await db
        .select({
          id: claimsTable.id,
          userId: claimsTable.userId,
          status: claimsTable.status,
          workflowState: claimsTable.workflowState,
          claimType: claimsTable.claimType,
          firstName: claimsTable.firstName,
          lastName: claimsTable.lastName,
          submittedAt: claimsTable.submittedAt,
          paymentStatus: claimsTable.paymentStatus,
          pensionType: claimsTable.pensionType,
          caseType: claimsTable.caseType,
          applicationId: claimsTable.applicationId,
          handlingRoute: claimsTable.handlingRoute,
          lawFirmRef: claimsTable.lawFirmRef,
          lawFirmCaseState: claimsTable.lawFirmCaseState,
          bavSettlementList: claimsTable.bavSettlementList,
          createdAt: claimsTable.createdAt,
          updatedAt: claimsTable.updatedAt,
          userEmail: users.email,
          profileFirstName: profiles.firstName,
          profileLastName: profiles.lastName,
        })
        .from(claimsTable)
        .leftJoin(users, eq(claimsTable.userId, users.id))
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      const claims = result.map((row) => ({
        id: row.id,
        userId: row.userId,
        status: row.status,
        workflowState: row.workflowState,
        claimType: row.claimType,
        caseType: resolveCaseType(row),
        applicantName:
          row.firstName && row.lastName
            ? `${row.firstName} ${row.lastName}`
            : row.profileFirstName && row.profileLastName
              ? `${row.profileFirstName} ${row.profileLastName}`
              : null,
        applicantEmail: row.userEmail,
        paymentStatus: row.paymentStatus,
        pensionType: row.pensionType,
        handlingRoute:
          row.handlingRoute ?? defaultHandlingRoute(resolveCaseType(row)),
        lawFirmRef: row.lawFirmRef,
        lawFirmCaseState:
          (row.handlingRoute ?? defaultHandlingRoute(resolveCaseType(row))) ===
          'law_firm'
            ? (row.lawFirmCaseState ?? 'new')
            : null,
        bavSettlementList: row.bavSettlementList ?? null,
        submittedAt: row.submittedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      return { claims, total, page, limit };
    } catch (error) {
      logger.error('Error getting all claims:', error);
      throw new Error('Failed to get claims');
    }
  }

  /**
   * Get a claim by ID without ownership check (admin only)
   */
  static async getClaimAsAdmin(claimId: string): Promise<Claim | null> {
    try {
      const result = await db
        .select()
        .from(claimsTable)
        .where(eq(claimsTable.id, claimId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return mapRowToClaim(result[0]);
    } catch (error) {
      logger.error('Error getting claim as admin:', error);
      throw new Error('Failed to get claim');
    }
  }

  /**
   * Get user info for a claim (admin only)
   */
  static async getClaimUserInfo(claimId: string): Promise<{
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null> {
    try {
      const result = await db
        .select({
          email: users.email,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
        })
        .from(claimsTable)
        .innerJoin(users, eq(claimsTable.userId, users.id))
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(claimsTable.id, claimId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Error getting claim user info:', error);
      throw new Error('Failed to get claim user info');
    }
  }

  // Valid status transitions for admin
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    submitted: ['processing'],
    processing: ['completed', 'rejected'],
  };

  /**
   * Update claim status with forward-only transitions (admin only)
   */
  static async updateClaimStatus(
    claimId: string,
    newStatus: string,
    adminUserId: string,
    note?: string
  ): Promise<Claim> {
    try {
      const claim = await this.getClaimAsAdmin(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      const currentStatus = claim.status;
      const allowedTransitions = this.VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus)) {
        throw new Error(
          `Invalid transition: cannot move from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`
        );
      }

      const result = await db.transaction(async (tx: any) => {
        // Update claim status and workflow state
        const [updatedClaim] = await tx
          .update(claimsTable)
          .set({
            status: newStatus,
            workflowState: newStatus,
            workflowHistory: sql`${claimsTable.workflowHistory} || ${JSON.stringify(
              [
                {
                  state: newStatus,
                  previousState: currentStatus,
                  timestamp: new Date().toISOString(),
                  triggeredBy: 'admin',
                  note: note || `Status changed to ${newStatus}`,
                },
              ]
            )}::jsonb`,
            updatedAt: new Date(),
          })
          .where(eq(claimsTable.id, claimId))
          .returning();

        // Record workflow state
        await tx.insert(claimWorkflowStates).values({
          claimId,
          state: newStatus,
          previousState: currentStatus,
          triggeredBy: 'admin',
          metadata: { adminUserId, note, action: 'status_update' },
        });

        // Audit log
        await tx.insert(auditLogs).values({
          userId: adminUserId,
          action: 'claim_status_updated',
          resource: 'claim',
          resourceId: claimId,
          details: {
            previousStatus: currentStatus,
            newStatus,
            note,
          },
        });

        return updatedClaim;
      });

      logger.info(
        `Claim ${claimId} status updated: ${currentStatus} -> ${newStatus} by admin ${adminUserId}`
      );
      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error updating claim status:', error);
      throw error;
    }
  }

  /**
   * Set how a claim is handled after submission (admin only). Orthogonal
   * to status: allowed in any status, but once the letter has gone to the
   * lettershop the switch only affects future (re)sends, so that case is
   * refused to avoid a second physical letter.
   */
  static async setHandlingRoute(
    claimId: string,
    adminUserId: string,
    input: {
      handlingRoute: ClaimHandlingRoute;
      payoutTarget?: ClaimPayoutTarget | null;
      lawFirmRef?: string | null;
      note?: string;
    }
  ): Promise<Claim> {
    try {
      const claim = await this.getClaimAsAdmin(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }
      const previousRoute =
        claim.handlingRoute ?? defaultHandlingRoute(claim.caseType);
      if (
        claim.lettershopSubmissionId &&
        input.handlingRoute === 'law_firm' &&
        previousRoute !== 'law_firm'
      ) {
        throw new Error(
          'Invalid routing change: this claim was already sent to the lettershop'
        );
      }

      // Direct handling always pays the client and has no law-firm file.
      const payoutTarget =
        input.handlingRoute === 'law_firm'
          ? (input.payoutTarget ?? claim.payoutTarget ?? 'client')
          : null;
      const lawFirmRef =
        input.handlingRoute === 'law_firm'
          ? input.lawFirmRef?.trim() || claim.lawFirmRef || null
          : null;
      const now = new Date();

      const result = await db.transaction(async (tx: any) => {
        const [updatedClaim] = await tx
          .update(claimsTable)
          .set({
            handlingRoute: input.handlingRoute,
            handlingRouteSetAt: now,
            handlingRouteSetBy: adminUserId,
            payoutTarget,
            lawFirmRef,
            updatedAt: now,
          })
          .where(eq(claimsTable.id, claimId))
          .returning();

        await tx.insert(claimWorkflowStates).values({
          claimId,
          state: claim.status,
          previousState: claim.status,
          triggeredBy: 'admin',
          metadata: {
            adminUserId,
            action: 'handling_route_update',
            previousRoute,
            handlingRoute: input.handlingRoute,
            payoutTarget,
            lawFirmRef,
            note: input.note,
          },
        });

        await tx.insert(auditLogs).values({
          userId: adminUserId,
          action: 'claim_handling_route_updated',
          resource: 'claim',
          resourceId: claimId,
          details: {
            previousRoute,
            handlingRoute: input.handlingRoute,
            payoutTarget,
            lawFirmRef,
            note: input.note,
          },
        });

        return updatedClaim;
      });

      logger.info(
        `Claim ${claimId} handling route updated: ${previousRoute} -> ${input.handlingRoute} by admin ${adminUserId}`
      );

      // Assign to the partner firm (regenerates the LAW package and
      // notifies the firm) or clear the assignment. Lazy import: the
      // law-firm service imports this module.
      const { LawFirmService } = await import('./law-firm');
      if (input.handlingRoute === 'law_firm' && previousRoute !== 'law_firm') {
        await LawFirmService.assignClaimToDefaultFirm(claimId, adminUserId);
      } else if (
        input.handlingRoute !== 'law_firm' &&
        previousRoute === 'law_firm'
      ) {
        await LawFirmService.unassignClaim(claimId, adminUserId);
      }
      const refreshed = await this.getClaimAsAdmin(claimId);
      return refreshed ?? mapRowToClaim(result);
    } catch (error) {
      logger.error('Error updating claim handling route:', error);
      throw error;
    }
  }

  /**
   * Add an admin note to a claim
   */
  static async addAdminNote(
    claimId: string,
    adminUserId: string,
    note: string
  ): Promise<void> {
    try {
      const claim = await this.getClaimAsAdmin(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      await db.transaction(async (tx: any) => {
        await tx.insert(claimWorkflowStates).values({
          claimId,
          state: claim.workflowState,
          previousState: claim.workflowState,
          triggeredBy: 'admin',
          metadata: { note, type: 'admin_note', adminUserId },
        });

        await tx.insert(auditLogs).values({
          userId: adminUserId,
          action: 'admin_note_added',
          resource: 'claim',
          resourceId: claimId,
          details: { note },
        });
      });

      logger.info(`Admin note added to claim ${claimId} by ${adminUserId}`);
    } catch (error) {
      logger.error('Error adding admin note:', error);
      throw error;
    }
  }

  /**
   * Get claim documents without ownership check (admin only)
   */
  static async getClaimDocumentsAsAdmin(
    claimId: string
  ): Promise<ClaimDocument[]> {
    try {
      const result = await db
        .select({
          id: claimDocuments.id,
          claimId: claimDocuments.claimId,
          documentId: claimDocuments.documentId,
          documentRole: claimDocuments.documentRole,
          createdAt: claimDocuments.createdAt,
          document: {
            id: documents.id,
            fileName: documents.fileName,
            fileType: documents.fileType,
            s3Key: documents.s3Key,
            status: documents.status,
          },
        })
        .from(claimDocuments)
        .leftJoin(documents, eq(claimDocuments.documentId, documents.id))
        .where(eq(claimDocuments.claimId, claimId));

      return result.map((row) => ({
        id: row.id,
        claimId: row.claimId,
        documentId: row.documentId,
        documentRole: row.documentRole as ClaimDocumentRole,
        createdAt: row.createdAt,
        document: row.document
          ? {
              id: row.document.id,
              fileName: row.document.fileName,
              fileType: row.document.fileType,
              s3Key: row.document.s3Key,
              status: row.document.status,
            }
          : undefined,
      }));
    } catch (error) {
      logger.error('Error getting claim documents as admin:', error);
      throw error;
    }
  }

  // ==================== bAV: PROVIDER MATRIX ====================

  /**
   * Copies the letter address from the provider matrix onto a bAV claim
   * whose recipient address is still empty (client answer item 7). Runs
   * at submission; ops can still edit the recipient fields afterwards.
   * Returns the patch applied, or null when nothing changed.
   */
  static async applyProviderAddress(
    claimId: string,
    userId?: string
  ): Promise<RecipientPatch | null> {
    const claim = userId
      ? await this.getClaim(claimId, userId)
      : await this.getClaimAsAdmin(claimId);
    if (!claim || claim.caseType !== 'bav_cashout') return null;
    const provider = await BavProviderService.findByName(claim.bavProviderName);
    if (!provider) return null;
    const patch = providerAddressPatch(claim, provider);
    if (!patch) return null;
    await db
      .update(claimsTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(claimsTable.id, claimId));
    logger.info('bAV recipient address filled from the provider matrix', {
      claimId,
      provider: provider.name,
    });
    return patch;
  }

  // ==================== bAV: PAYOUT / FEE SPLIT ====================

  /**
   * Records the Abfindung received on the Anderkonto and the fee split
   * (client answer item 5). Re-recording overwrites the previous figures.
   */
  static async recordBavPayout(
    claimId: string,
    adminUserId: string,
    input: BavPayoutInput
  ): Promise<{ claim: Claim; split: BavPayoutRecord['split'] }> {
    const claim = await this.getClaimAsAdmin(claimId);
    if (!claim) throw new Error('Claim not found');
    if (claim.caseType !== 'bav_cashout') {
      throw new Error('Invalid payout: only bAV cash-out claims have one');
    }
    if (claim.status === 'draft') {
      throw new Error('Invalid payout: the claim has not been submitted');
    }
    const record = buildBavPayoutRecord(input);
    const now = new Date();

    const result = await db.transaction(async (tx: any) => {
      const [updated] = await tx
        .update(claimsTable)
        .set({
          ...record.columns,
          bavPayoutRecordedAt: now,
          bavPayoutRecordedBy: adminUserId,
          updatedAt: now,
        })
        .where(eq(claimsTable.id, claimId))
        .returning();
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: claim.status,
        previousState: claim.status,
        triggeredBy: 'admin',
        metadata: {
          action: 'bav_payout_recorded',
          adminUserId,
          valueDate: input.valueDate,
          ...record.split,
        },
      });
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'claim_bav_payout_recorded',
        resource: 'claim',
        resourceId: claimId,
        details: { valueDate: input.valueDate, ...record.split },
      });
      return updated;
    });

    logger.info('bAV payout recorded', {
      claimId,
      amount: record.split.amountReceived,
      fee: record.split.fee,
      smallRefund: record.split.smallRefund,
    });
    // Client-update engine: funds on the Anderkonto end the waiting
    // sequence (or flag funds-before-decision). Non-fatal.
    try {
      const { ClientUpdatesService } = await import('./client-updates');
      await ClientUpdatesService.onFundsReceived(
        claimId,
        new Date(`${input.valueDate}T12:00:00Z`)
      );
    } catch (error) {
      logger.error('Client-update funds hook failed', { claimId, error });
    }
    return { claim: mapRowToClaim(result), split: record.split };
  }

  /** Year-end list of small-refund cases (no law-firm fee deducted). */
  static async getBavSettlementList(year: number): Promise<SettlementList> {
    const rows = await db
      .select({
        id: claimsTable.id,
        firstName: claimsTable.firstName,
        lastName: claimsTable.lastName,
        lawFirmRef: claimsTable.lawFirmRef,
        bavProviderName: claimsTable.bavProviderName,
        bavPayoutAmount: claimsTable.bavPayoutAmount,
        bavFeeEur: claimsTable.bavFeeEur,
        bavPayoutValueDate: claimsTable.bavPayoutValueDate,
      })
      .from(claimsTable)
      .where(
        and(
          eq(claimsTable.bavSettlementList, true),
          sql`extract(year from ${claimsTable.bavPayoutValueDate}) = ${year}`
        )
      )
      .orderBy(claimsTable.bavPayoutValueDate, claimsTable.lastName);
    const list: SettlementListRow[] = rows.map((r) => ({
      claimId: r.id,
      claimantName:
        r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : null,
      lawFirmRef: r.lawFirmRef,
      bavProviderName: r.bavProviderName,
      payoutAmount: Number(r.bavPayoutAmount ?? 0),
      feeEur: Number(r.bavFeeEur ?? 0),
      valueDate: String(r.bavPayoutValueDate),
    }));
    return summarizeSettlementList(year, list);
  }

  // ==================== bAV: EXTRA DOCUMENTS (ops) ====================

  static readonly EXTRA_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
  static readonly EXTRA_DOCUMENT_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ]);

  /**
   * Attaches an extra document to a bAV claim (role 'bav_extra'); the
   * package merges these after the standard enclosures in upload order.
   * Ops regenerate the package via POST /admin/claims/:id/package/regenerate.
   */
  static async attachExtraDocument(
    claimId: string,
    adminUserId: string,
    file: File,
    note?: string | null
  ): Promise<ClaimDocument> {
    const claim = await this.getClaimAsAdmin(claimId);
    if (!claim) throw new Error('Claim not found');
    if (claim.caseType !== 'bav_cashout') {
      throw new Error('Invalid document: only bAV cash-out claims take extras');
    }
    if (file.size > this.EXTRA_DOCUMENT_MAX_BYTES) {
      throw new Error('Invalid file: size exceeds 10MB limit');
    }
    if (!this.EXTRA_DOCUMENT_TYPES.has(file.type)) {
      throw new Error('Invalid file: allowed types are PDF, JPG, PNG');
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const s3Key = `claims/${claimId}/extra/${randomUUID()}.${ext}`;
    await uploadFile(s3Key, Buffer.from(await file.arrayBuffer()), file.type);

    const { row, doc } = await db.transaction(async (tx: any) => {
      const [doc] = await tx
        .insert(documents)
        .values({
          userId: adminUserId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          s3Key,
          documentType: 'bav_extra',
          status: 'completed',
        })
        .returning();
      const [row] = await tx
        .insert(claimDocuments)
        .values({ claimId, documentId: doc.id, documentRole: 'bav_extra' })
        .returning();
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'claim_extra_document_added',
        resource: 'claim',
        resourceId: claimId,
        details: {
          claimDocumentId: row.id,
          documentId: doc.id,
          fileName: file.name,
          fileSize: file.size,
          note: note?.trim() || null,
        },
      });
      return { row, doc };
    });

    logger.info('Extra document attached to bAV claim', {
      claimId,
      documentId: doc.id,
    });
    return {
      id: row.id,
      claimId,
      documentId: doc.id,
      documentRole: 'bav_extra',
      createdAt: row.createdAt,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        s3Key: doc.s3Key,
        status: doc.status,
      },
    };
  }

  /** Detaches (and deletes) an ops-attached extra document. */
  static async removeExtraDocument(
    claimId: string,
    claimDocumentId: string,
    adminUserId: string
  ): Promise<boolean> {
    const [link] = await db
      .select({
        id: claimDocuments.id,
        documentId: claimDocuments.documentId,
        s3Key: documents.s3Key,
      })
      .from(claimDocuments)
      .leftJoin(documents, eq(claimDocuments.documentId, documents.id))
      .where(
        and(
          eq(claimDocuments.id, claimDocumentId),
          eq(claimDocuments.claimId, claimId),
          eq(claimDocuments.documentRole, 'bav_extra')
        )
      )
      .limit(1);
    if (!link) return false;
    await db.transaction(async (tx: any) => {
      await tx.delete(claimDocuments).where(eq(claimDocuments.id, link.id));
      await tx.delete(documents).where(eq(documents.id, link.documentId));
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'claim_extra_document_removed',
        resource: 'claim',
        resourceId: claimId,
        details: { claimDocumentId: link.id, documentId: link.documentId },
      });
    });
    if (link.s3Key) {
      await deleteFile(link.s3Key).catch((error: unknown) =>
        logger.warn('Extra document file not deleted from S3', {
          claimId,
          s3Key: link.s3Key,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
    return true;
  }

  /**
   * Get workflow history without ownership check (admin only)
   */
  static async getWorkflowHistoryAsAdmin(
    claimId: string
  ): Promise<WorkflowStateEntry[]> {
    try {
      const result = await db
        .select()
        .from(claimWorkflowStates)
        .where(eq(claimWorkflowStates.claimId, claimId))
        .orderBy(desc(claimWorkflowStates.createdAt));

      return result.map((row) => ({
        id: row.id,
        claimId: row.claimId,
        state: row.state,
        previousState: row.previousState,
        triggeredBy: row.triggeredBy,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting workflow history as admin:', error);
      throw error;
    }
  }

  /**
   * Get claim statistics (admin only)
   */
  static async getClaimStats(): Promise<Record<string, number>> {
    try {
      const result = await db
        .select({
          status: claimsTable.status,
          value: count(),
        })
        .from(claimsTable)
        .groupBy(claimsTable.status);

      const stats: Record<string, number> = {
        total: 0,
        draft: 0,
        ready: 0,
        submitted: 0,
        processing: 0,
        completed: 0,
        rejected: 0,
        lawFirm: 0,
      };

      for (const row of result) {
        const status = row.status || 'draft';
        stats[status] = row.value;
        stats.total += row.value;
      }

      // Claims handed to the partner firm (past draft), for the queue tile.
      const [lawFirmRow] = await db
        .select({ value: count() })
        .from(claimsTable)
        .where(
          and(
            eq(claimsTable.handlingRoute, 'law_firm'),
            sql`${claimsTable.status} <> 'draft'`
          )
        );
      stats.lawFirm = lawFirmRow?.value ?? 0;

      return stats;
    } catch (error) {
      logger.error('Error getting claim stats:', error);
      throw new Error('Failed to get claim stats');
    }
  }

  /**
   * Get a document's S3 key for download (admin only)
   */
  static async getDocumentForDownload(
    documentId: string
  ): Promise<{ s3Key: string; fileName: string; fileType: string } | null> {
    try {
      const [doc] = await db
        .select({
          s3Key: documents.s3Key,
          fileName: documents.fileName,
          fileType: documents.fileType,
        })
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      return doc || null;
    } catch (error) {
      logger.error('Error getting document for download:', error);
      throw new Error('Failed to get document');
    }
  }
}
