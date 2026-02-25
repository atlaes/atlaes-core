import { eq, and, sql } from 'drizzle-orm';
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
} from '../drizzle/schema/claims';
import { auditLogs, documents } from '../drizzle/schema/shared';
import { logger } from '../utils/logger';

// Types for completed steps tracking
export interface CompletedSteps {
  claimType?: boolean;
  passportUpload?: boolean;
  currentAddress?: boolean;
  germanSocialInsurance?: boolean;
  lastAddressInGermany?: boolean;
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

export interface ClaimData extends ClaimPersonalInfo, ClaimCurrentAddress, ClaimGermanAddress, ClaimBankDetails {
  svNummer?: string;
  certifyingAuthority?: CertifyingAuthority;
  confirmationAccuracyAccepted?: boolean;
  confirmationAuthorizationAccepted?: boolean;
}

export interface Claim {
  id: string;
  userId: string;
  applicationId: string | null;
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
  serviceFee: string | null;

  // Submission
  submittedAt: Date | null;

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
  return {
    id: row.id,
    userId: row.userId,
    applicationId: row.applicationId,
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
    serviceFee: row.serviceFee,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ClaimsApplicationService {
  /**
   * Create a new claim for a user
   */
  static async createClaim(userId: string, applicationId?: string): Promise<Claim> {
    try {
      const result = await db.transaction(async (tx: any) => {
        // Create the claim
        const [newClaim] = await tx
          .insert(claimsTable)
          .values({
            userId,
            applicationId: applicationId || null,
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
          details: { applicationId },
        });

        return newClaim;
      });

      logger.info(`Claim created for user: ${userId}, claim: ${result.id}`);
      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error creating claim:', error);
      throw new Error('Failed to create claim');
    }
  }

  /**
   * Get a claim by ID with ownership verification
   */
  static async getClaim(claimId: string, userId: string): Promise<Claim | null> {
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
  static async updateClaim(claimId: string, userId: string, data: Partial<ClaimData>): Promise<Claim | null> {
    try {
      // Verify ownership first
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        return null;
      }

      // Don't allow updates to submitted claims
      if (existing.status === 'submitted' || existing.status === 'processing' || existing.status === 'completed') {
        throw new Error('Cannot update a submitted claim');
      }

      const result = await db
        .update(claimsTable)
        .set({
          ...data,
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
        await tx.delete(claimDocuments).where(eq(claimDocuments.claimId, claimId));
        await tx.delete(claimWorkflowStates).where(eq(claimWorkflowStates.claimId, claimId));

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
  static async markStepComplete(claimId: string, userId: string, step: ClaimStepName): Promise<CompletedSteps> {
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
        .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)));

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
  static async markStepIncomplete(claimId: string, userId: string, step: ClaimStepName): Promise<CompletedSteps> {
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
        .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)));

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
  static async getCompletedSteps(claimId: string, userId: string): Promise<CompletedSteps> {
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

      // Remove any existing document with the same role (replace pattern)
      await db
        .delete(claimDocuments)
        .where(and(eq(claimDocuments.claimId, claimId), eq(claimDocuments.documentRole, role)));

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
  static async removeDocument(claimId: string, userId: string, documentId: string): Promise<boolean> {
    try {
      const existing = await this.getClaim(claimId, userId);
      if (!existing) {
        throw new Error('Claim not found');
      }

      const result = await db
        .delete(claimDocuments)
        .where(and(eq(claimDocuments.claimId, claimId), eq(claimDocuments.documentId, documentId)))
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
  static async getClaimDocuments(claimId: string, userId: string): Promise<ClaimDocument[]> {
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
  static async attachSignature(claimId: string, userId: string, signatureId: string): Promise<Claim | null> {
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
            workflowHistory: sql`${claimsTable.workflowHistory} || ${JSON.stringify([
              {
                state: newState,
                previousState,
                timestamp: new Date().toISOString(),
                triggeredBy: 'user',
              },
            ])}::jsonb`,
            updatedAt: new Date(),
          })
          .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
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

      logger.info(`Claim workflow transitioned: ${claimId} from ${previousState} to ${newState}`);
      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error transitioning workflow state:', error);
      throw error;
    }
  }

  /**
   * Get workflow history for a claim
   */
  static async getWorkflowHistory(claimId: string, userId: string): Promise<WorkflowStateEntry[]> {
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
  static async validateForSubmission(claimId: string, userId: string): Promise<ValidationResult> {
    try {
      const claim = await this.getClaim(claimId, userId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      const missingSteps: ClaimStepName[] = [];
      const errors: string[] = [];

      // Required steps
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

      // Check required fields
      if (!claim.claimType) errors.push('Claim type is required');
      if (!claim.firstName) errors.push('First name is required');
      if (!claim.lastName) errors.push('Last name is required');
      if (!claim.dateOfBirth) errors.push('Date of birth is required');
      if (!claim.passportNumber) errors.push('Passport number is required');
      if (!claim.currentAddressLine1) errors.push('Current address is required');
      if (!claim.currentCity) errors.push('Current city is required');
      if (!claim.currentCountry) errors.push('Current country is required');
      if (!claim.germanStreet) errors.push('German address is required');
      if (!claim.germanCity) errors.push('German city is required');
      if (!claim.moveOutDate) errors.push('Move out date is required');
      if (!claim.accountHolderName) errors.push('Bank account holder name is required');
      if (!claim.bankName) errors.push('Bank name is required');
      if (!claim.signatureId) errors.push('Signature is required');
      if (!claim.confirmationAccuracyAccepted) errors.push('Accuracy confirmation is required');
      if (!claim.confirmationAuthorizationAccepted) errors.push('Authorization confirmation is required');

      // Check for required documents
      const docs = await this.getClaimDocuments(claimId, userId);
      const hasPassport = docs.some((d) => d.documentRole === 'passport');
      const hasCertifiedId = docs.some((d) => d.documentRole === 'certified_id_form');

      if (!hasPassport) errors.push('Passport document is required');
      if (!hasCertifiedId) errors.push('Certified identity form is required');

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
      // Validate first
      const validation = await this.validateForSubmission(claimId, userId);
      if (!validation.isValid) {
        throw new Error(`Claim validation failed: ${validation.errors.join(', ')}`);
      }

      const result = await db.transaction(async (tx: any) => {
        // Update claim status
        const [updatedClaim] = await tx
          .update(claimsTable)
          .set({
            status: 'submitted',
            workflowState: 'submitted',
            submittedAt: new Date(),
            workflowHistory: sql`${claimsTable.workflowHistory} || ${JSON.stringify([
              {
                state: 'submitted',
                timestamp: new Date().toISOString(),
                triggeredBy: 'user',
                note: 'Claim submitted by user',
              },
            ])}::jsonb`,
            updatedAt: new Date(),
          })
          .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
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
      return mapRowToClaim(result);
    } catch (error) {
      logger.error('Error submitting claim:', error);
      throw error;
    }
  }

  // ==================== ADMIN (FUTURE) ====================

  /**
   * Process a submitted claim (admin/system function)
   */
  static async processSubmission(claimId: string): Promise<void> {
    // This would be called by admin or system to process the claim
    // Implementation depends on business requirements
    logger.info(`Processing claim submission: ${claimId}`);
    // TODO: Implement claim processing logic
  }
}
