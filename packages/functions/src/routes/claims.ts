import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import {
  ClaimsApplicationService,
  ClaimData,
} from '../services/claims-application';
import { ClaimDocumentRole, ClaimStepName, ClaimWorkflowState } from '../drizzle/schema/claims';

const claims = new Hono();

// ============================================================
// Validation Schemas
// ============================================================

// Create claim schema
const createClaimSchema = z.object({
  applicationId: z.string().uuid().optional(),
});

// Update claim schema (all fields optional for partial updates)
const updateClaimSchema = z.object({
  // Claim Type
  claimType: z.enum(['own_refund', 'surviving_spouse']).optional(),

  // Personal Information (Passport data)
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  placeOfBirth: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  passportNumber: z.string().max(50).optional(),
  passportIssueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passportExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  // Current Address
  currentAddressLine1: z.string().max(255).optional(),
  currentAddressLine2: z.string().max(255).optional(),
  currentCity: z.string().max(100).optional(),
  currentPostalCode: z.string().max(20).optional(),
  currentCountry: z.string().max(100).optional(),

  // German Social Insurance
  svNummer: z.string().max(50).optional(),

  // Last German Address
  germanStreet: z.string().max(255).optional(),
  germanPostalCode: z.string().max(20).optional(),
  germanCity: z.string().max(100).optional(),
  moveOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  abmeldungMethod: z.enum(['uploaded', 'manual', 'service_requested']).optional(),
  deregistrationServiceRequested: z.boolean().optional(),

  // Bank Details
  preferredCurrency: z.string().max(10).optional(),
  accountHolderName: z.string().max(255).optional(),
  bankName: z.string().max(255).optional(),
  accountNumber: z.string().max(50).optional(),
  bsb: z.string().max(20).optional(),
  swiftBic: z.string().max(20).optional(),
  iban: z.string().max(50).optional(),
  bankStreet: z.string().max(255).optional(),
  bankCity: z.string().max(100).optional(),
  bankPostalCode: z.string().max(20).optional(),
  bankCountry: z.string().max(100).optional(),

  // ID Verification
  certifyingAuthority: z
    .enum(['notary_public', 'local_government', 'bank_branch', 'police', 'embassy', 'justice_of_peace'])
    .optional(),

  // Confirmations
  confirmationAccuracyAccepted: z.boolean().optional(),
  confirmationAuthorizationAccepted: z.boolean().optional(),
});

// Add document schema
const addDocumentSchema = z.object({
  documentId: z.string().uuid(),
  documentRole: z.enum(['passport', 'payslip', 'abmeldung', 'bank_statement', 'certified_id_form']),
});

// Attach signature schema
const attachSignatureSchema = z.object({
  signatureId: z.string().uuid(),
});

// Workflow transition schema
const workflowTransitionSchema = z.object({
  state: z.enum([
    'personal_info',
    'documents',
    'payment_details',
    'signature',
    'id_verification',
    'review',
  ]),
  metadata: z.record(z.unknown()).optional(),
});

// Step completion schema
const stepCompletionSchema = z.object({
  completed: z.boolean(),
});

// Valid step names
const validStepNames: ClaimStepName[] = [
  'claimType',
  'passportUpload',
  'currentAddress',
  'germanSocialInsurance',
  'lastAddressInGermany',
  'bankDetails',
  'signDocuments',
  'identityConfirmationForm',
  'reviewInformation',
  'finalConfirmation',
];

// ============================================================
// Health Check
// ============================================================

claims.get('/health', async (c) => {
  return c.json({
    success: true,
    service: 'Claims',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Claim CRUD Endpoints
// ============================================================

// Create a new claim
claims.post('/', authMiddleware, zValidator('json', createClaimSchema), async (c) => {
  try {
    const user = c.get('user');
    const { applicationId } = c.req.valid('json');

    const claim = await ClaimsApplicationService.createClaim(user.id, applicationId);

    logger.info(`Claim created: ${claim.id} for user: ${user.id}`);

    return c.json({
      success: true,
      claim,
    });
  } catch (error) {
    logger.error('Create claim error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Get all claims for user
claims.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const userClaims = await ClaimsApplicationService.getUserClaims(user.id);

    return c.json({
      success: true,
      claims: userClaims,
    });
  } catch (error) {
    logger.error('Get claims error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get claims',
      },
      500
    );
  }
});

// Get single claim by ID
claims.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const claim = await ClaimsApplicationService.getClaim(claimId, user.id);

    if (!claim) {
      return c.json(
        {
          success: false,
          error: 'Claim not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      claim,
    });
  } catch (error) {
    logger.error('Get claim error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get claim',
      },
      500
    );
  }
});

// Update claim
claims.put('/:id', authMiddleware, zValidator('json', updateClaimSchema), async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');
    const data = c.req.valid('json') as Partial<ClaimData>;

    const claim = await ClaimsApplicationService.updateClaim(claimId, user.id, data);

    if (!claim) {
      return c.json(
        {
          success: false,
          error: 'Claim not found',
        },
        404
      );
    }

    logger.info(`Claim updated: ${claimId} by user: ${user.id}`);

    return c.json({
      success: true,
      claim,
    });
  } catch (error) {
    logger.error('Update claim error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update claim',
      },
      error instanceof Error && error.message.includes('Cannot update') ? 400 : 500
    );
  }
});

// Delete draft claim
claims.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const deleted = await ClaimsApplicationService.deleteClaim(claimId, user.id);

    if (!deleted) {
      return c.json(
        {
          success: false,
          error: 'Claim not found',
        },
        404
      );
    }

    logger.info(`Claim deleted: ${claimId} by user: ${user.id}`);

    return c.json({
      success: true,
      message: 'Claim deleted successfully',
    });
  } catch (error) {
    logger.error('Delete claim error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete claim',
      },
      error instanceof Error && error.message.includes('Only draft') ? 400 : 500
    );
  }
});

// ============================================================
// Document Management Endpoints
// ============================================================

// Add document to claim
claims.post('/:id/documents', authMiddleware, zValidator('json', addDocumentSchema), async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');
    const { documentId, documentRole } = c.req.valid('json');

    const claimDocument = await ClaimsApplicationService.addDocument(
      claimId,
      user.id,
      documentId,
      documentRole as ClaimDocumentRole
    );

    logger.info(`Document added to claim: ${claimId}, role: ${documentRole}`);

    return c.json({
      success: true,
      claimDocument,
    });
  } catch (error) {
    logger.error('Add document error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add document',
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    );
  }
});

// Get all documents for claim
claims.get('/:id/documents', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const documents = await ClaimsApplicationService.getClaimDocuments(claimId, user.id);

    return c.json({
      success: true,
      documents,
    });
  } catch (error) {
    logger.error('Get documents error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get documents',
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    );
  }
});

// Remove document from claim
claims.delete('/:id/documents/:docId', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');
    const documentId = c.req.param('docId');

    const removed = await ClaimsApplicationService.removeDocument(claimId, user.id, documentId);

    if (!removed) {
      return c.json(
        {
          success: false,
          error: 'Document not found on claim',
        },
        404
      );
    }

    logger.info(`Document removed from claim: ${claimId}`);

    return c.json({
      success: true,
      message: 'Document removed successfully',
    });
  } catch (error) {
    logger.error('Remove document error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove document',
      },
      500
    );
  }
});

// ============================================================
// Signature Endpoint
// ============================================================

// Attach signature to claim
claims.post('/:id/signature', authMiddleware, zValidator('json', attachSignatureSchema), async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');
    const { signatureId } = c.req.valid('json');

    const claim = await ClaimsApplicationService.attachSignature(claimId, user.id, signatureId);

    if (!claim) {
      return c.json(
        {
          success: false,
          error: 'Claim not found',
        },
        404
      );
    }

    logger.info(`Signature attached to claim: ${claimId}`);

    return c.json({
      success: true,
      claim,
    });
  } catch (error) {
    logger.error('Attach signature error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to attach signature',
      },
      500
    );
  }
});

// ============================================================
// Step Completion Endpoints
// ============================================================

// Get step completion status
claims.get('/:id/steps', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const completedSteps = await ClaimsApplicationService.getCompletedSteps(claimId, user.id);

    return c.json({
      success: true,
      completedSteps,
    });
  } catch (error) {
    logger.error('Get steps error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get step status',
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    );
  }
});

// Update step completion status
claims.put('/:id/steps/:stepName', authMiddleware, zValidator('json', stepCompletionSchema), async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');
    const stepName = c.req.param('stepName') as ClaimStepName;
    const { completed } = c.req.valid('json');

    // Validate step name
    if (!validStepNames.includes(stepName)) {
      return c.json(
        {
          success: false,
          error: `Invalid step name. Valid steps: ${validStepNames.join(', ')}`,
        },
        400
      );
    }

    let completedSteps;
    if (completed) {
      completedSteps = await ClaimsApplicationService.markStepComplete(claimId, user.id, stepName);
    } else {
      completedSteps = await ClaimsApplicationService.markStepIncomplete(claimId, user.id, stepName);
    }

    logger.info(`Step ${stepName} ${completed ? 'completed' : 'uncompleted'} for claim: ${claimId}`);

    return c.json({
      success: true,
      completedSteps,
    });
  } catch (error) {
    logger.error('Update step error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update step status',
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    );
  }
});

// ============================================================
// Workflow Endpoints
// ============================================================

// Transition workflow state
claims.post('/:id/workflow', authMiddleware, zValidator('json', workflowTransitionSchema), async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');
    const { state, metadata } = c.req.valid('json');

    const claim = await ClaimsApplicationService.transitionState(
      claimId,
      user.id,
      state as ClaimWorkflowState,
      metadata
    );

    if (!claim) {
      return c.json(
        {
          success: false,
          error: 'Claim not found',
        },
        404
      );
    }

    logger.info(`Claim ${claimId} workflow transitioned to: ${state}`);

    return c.json({
      success: true,
      claim,
    });
  } catch (error) {
    logger.error('Workflow transition error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transition workflow',
      },
      500
    );
  }
});

// Get workflow history
claims.get('/:id/workflow/history', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const history = await ClaimsApplicationService.getWorkflowHistory(claimId, user.id);

    return c.json({
      success: true,
      history,
    });
  } catch (error) {
    logger.error('Get workflow history error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workflow history',
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    );
  }
});

// ============================================================
// Validation and Submission Endpoints
// ============================================================

// Validate claim for submission
claims.get('/:id/validate', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const validation = await ClaimsApplicationService.validateForSubmission(claimId, user.id);

    return c.json({
      success: true,
      validation,
    });
  } catch (error) {
    logger.error('Validate claim error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate claim',
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    );
  }
});

// Submit claim
claims.post('/:id/submit', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const claim = await ClaimsApplicationService.submitClaim(claimId, user.id);

    logger.info(`Claim submitted: ${claimId} by user: ${user.id}`);

    return c.json({
      success: true,
      claim,
      message: 'Claim submitted successfully',
    });
  } catch (error) {
    logger.error('Submit claim error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit claim',
      },
      error instanceof Error && error.message.includes('validation failed') ? 400 : 500
    );
  }
});

// ============================================================
// Identity Form Download (for ID Verification step)
// ============================================================

// Record identity form download
claims.post('/:id/identity-form-downloaded', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const claimId = c.req.param('id');

    const claim = await ClaimsApplicationService.updateClaim(claimId, user.id, {});

    if (!claim) {
      return c.json(
        {
          success: false,
          error: 'Claim not found',
        },
        404
      );
    }

    // Update the identity form downloaded timestamp using raw update
    // (This is a special case - we're recording a timestamp, not user-provided data)
    const { db } = await import('../utils/db');
    const { claimsTable } = await import('../drizzle/schema/claims');
    const { eq, and } = await import('drizzle-orm');

    await db
      .update(claimsTable)
      .set({
        identityFormDownloadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, user.id)));

    logger.info(`Identity form download recorded for claim: ${claimId}`);

    return c.json({
      success: true,
      message: 'Identity form download recorded',
    });
  } catch (error) {
    logger.error('Record identity form download error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record download',
      },
      500
    );
  }
});

export default claims;
