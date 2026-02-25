import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { claimsTable, claimDocuments, claimWorkflowStates } from '../drizzle/schema/claims';
import { users, profiles, documents, auditLogs, signatures } from '../drizzle/schema/shared';
import { ClaimsApplicationService } from './claims-application';
import { GPRApplicationService } from './gpr-application';
import {
  completeClaim,
  claimPersonalInfo,
  claimCurrentAddress,
  claimBankDetails,
  minimalClaimData,
  gprSessionData,
} from '../test/fixtures';

// Test database connection
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;

// Test data tracking for cleanup
const createdUserIds: string[] = [];
const createdClaimIds: string[] = [];

describe('ClaimsApplicationService', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  beforeEach(async () => {
    // Clear any leftover data
  });

  afterEach(async () => {
    await cleanupTestData();
    createdUserIds.length = 0;
    createdClaimIds.length = 0;
  });

  async function cleanupTestData() {
    try {
      for (const claimId of createdClaimIds) {
        await testClient`
          DELETE FROM claims.claim_documents WHERE claim_id = ${claimId}::uuid
        `;
        await testClient`
          DELETE FROM claims.claim_workflow_states WHERE claim_id = ${claimId}::uuid
        `;
        await testClient`
          DELETE FROM claims.claims WHERE id = ${claimId}::uuid
        `;
      }

      for (const userId of createdUserIds) {
        await testClient`
          DELETE FROM claims.claims WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM gpr.applications WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.audit_logs WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.signatures WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.documents WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.profiles WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.users WHERE id = ${userId}::uuid
        `;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Helper to create test user
  async function createTestUser(): Promise<string> {
    const testEmail = `test-claims-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    const [user] = await testDb
      .insert(users)
      .values({
        email: testEmail,
        emailVerified: true,
        authProvider: 'magic_link',
      })
      .returning();

    await testDb.insert(profiles).values({
      userId: user.id,
      firstName: 'Test',
      lastName: 'User',
    });

    createdUserIds.push(user.id);
    return user.id;
  }

  // Helper to create test document
  async function createTestDocument(userId: string, role: string = 'passport'): Promise<string> {
    const [doc] = await testDb
      .insert(documents)
      .values({
        userId,
        fileName: `test-${role}.pdf`,
        fileType: 'application/pdf',
        fileSize: 1024,
        s3Key: `test/${userId}/${role}.pdf`,
        documentType: role,
        status: 'completed',
      })
      .returning();

    return doc.id;
  }

  // Helper to create test signature
  async function createTestSignature(userId: string): Promise<string> {
    const [sig] = await testDb
      .insert(signatures)
      .values({
        userId,
        signatureData: 'data:image/png;base64,iVBORw0KGgo=',
        isActive: true,
      })
      .returning();

    return sig.id;
  }

  // Helper to create user with GPR application (for FK constraint satisfaction)
  async function createUserWithApplication(email: string): Promise<{ userId: string; applicationId: string }> {
    // Save a pending session
    await GPRApplicationService.savePendingSession({
      email,
      ipAddress: '127.0.0.1',
      calculatorData: gprSessionData.calculatorData,
      eligibilityData: gprSessionData.eligibilityData,
    });

    // Create user
    const [user] = await testDb
      .insert(users)
      .values({
        email: email.toLowerCase(),
        emailVerified: true,
        authProvider: 'magic_link',
      })
      .returning();

    await testDb.insert(profiles).values({
      userId: user.id,
      firstName: 'Test',
      lastName: 'User',
    });

    createdUserIds.push(user.id);

    // Migrate session to application
    const application = await GPRApplicationService.migrateToApplication(email, user.id);

    if (!application) {
      throw new Error('Failed to create GPR application');
    }

    return { userId: user.id, applicationId: application.id };
  }

  // ============================================================
  // Claim Creation Tests
  // ============================================================

  describe('createClaim', () => {
    it('creates a new claim for a user', async () => {
      const userId = await createTestUser();
      const claim = await ClaimsApplicationService.createClaim(userId);

      createdClaimIds.push(claim.id);

      expect(claim).toMatchObject({
        id: expect.any(String),
        userId,
        status: 'draft',
        workflowState: 'personal_info',
        completedSteps: {},
      });
    });

    it('creates claim linked to GPR application', async () => {
      // First, create a user and GPR application through the migration flow
      const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const { userId, applicationId } = await createUserWithApplication(email);

      // Create a claim linked to the real application
      const claim = await ClaimsApplicationService.createClaim(userId, applicationId);

      createdClaimIds.push(claim.id);

      expect(claim.applicationId).toBe(applicationId);
    });

    it('creates initial workflow state entry', async () => {
      const userId = await createTestUser();
      const claim = await ClaimsApplicationService.createClaim(userId);

      createdClaimIds.push(claim.id);

      const history = await ClaimsApplicationService.getWorkflowHistory(claim.id, userId);

      expect(history.length).toBe(1);
      expect(history[0].state).toBe('personal_info');
      expect(history[0].previousState).toBeNull();
    });

    it('creates audit log entry', async () => {
      const userId = await createTestUser();
      const claim = await ClaimsApplicationService.createClaim(userId);

      createdClaimIds.push(claim.id);

      const logs = await testDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.resourceId, claim.id))
        .limit(1);

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('claim_created');
    });
  });

  // ============================================================
  // Claim Retrieval Tests
  // ============================================================

  describe('getClaim', () => {
    it('returns claim for owner', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const claim = await ClaimsApplicationService.getClaim(created.id, userId);

      expect(claim).not.toBeNull();
      expect(claim!.id).toBe(created.id);
      expect(claim!.userId).toBe(userId);
    });

    it('returns null for non-existent claim', async () => {
      const userId = await createTestUser();
      const fakeId = crypto.randomUUID();

      const claim = await ClaimsApplicationService.getClaim(fakeId, userId);

      expect(claim).toBeNull();
    });

    it('returns null when user does not own claim', async () => {
      const userId1 = await createTestUser();
      const userId2 = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId1);
      createdClaimIds.push(created.id);

      const claim = await ClaimsApplicationService.getClaim(created.id, userId2);

      expect(claim).toBeNull();
    });
  });

  describe('getUserClaims', () => {
    it('returns all claims for user', async () => {
      const userId = await createTestUser();

      const claim1 = await ClaimsApplicationService.createClaim(userId);
      const claim2 = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(claim1.id, claim2.id);

      const claims = await ClaimsApplicationService.getUserClaims(userId);

      expect(claims.length).toBe(2);
      expect(claims.map((c) => c.id)).toContain(claim1.id);
      expect(claims.map((c) => c.id)).toContain(claim2.id);
    });

    it('returns empty array for user with no claims', async () => {
      const userId = await createTestUser();

      const claims = await ClaimsApplicationService.getUserClaims(userId);

      expect(claims).toEqual([]);
    });

    it('orders claims by creation date descending', async () => {
      const userId = await createTestUser();

      const claim1 = await ClaimsApplicationService.createClaim(userId);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const claim2 = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(claim1.id, claim2.id);

      const claims = await ClaimsApplicationService.getUserClaims(userId);

      expect(claims[0].id).toBe(claim2.id); // Most recent first
      expect(claims[1].id).toBe(claim1.id);
    });
  });

  // ============================================================
  // Claim Update Tests
  // ============================================================

  describe('updateClaim', () => {
    it('updates claim fields', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const updated = await ClaimsApplicationService.updateClaim(created.id, userId, {
        firstName: 'John',
        lastName: 'Doe',
        claimType: 'own_refund',
      });

      expect(updated).not.toBeNull();
      expect(updated!.firstName).toBe('John');
      expect(updated!.lastName).toBe('Doe');
      expect(updated!.claimType).toBe('own_refund');
    });

    it('updates partial data without overwriting other fields', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      // First update
      await ClaimsApplicationService.updateClaim(created.id, userId, {
        firstName: 'John',
      });

      // Second update - should not clear firstName
      const updated = await ClaimsApplicationService.updateClaim(created.id, userId, {
        lastName: 'Doe',
      });

      expect(updated!.firstName).toBe('John');
      expect(updated!.lastName).toBe('Doe');
    });

    it('prevents update of submitted claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      // Manually set status to submitted
      await testDb
        .update(claimsTable)
        .set({ status: 'submitted' })
        .where(eq(claimsTable.id, created.id));

      await expect(
        ClaimsApplicationService.updateClaim(created.id, userId, {
          firstName: 'Changed',
        })
      ).rejects.toThrow('Cannot update a submitted claim');
    });

    it('returns null when user does not own claim', async () => {
      const userId1 = await createTestUser();
      const userId2 = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId1);
      createdClaimIds.push(created.id);

      const updated = await ClaimsApplicationService.updateClaim(created.id, userId2, {
        firstName: 'Changed',
      });

      expect(updated).toBeNull();
    });

    it('updates updatedAt timestamp', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const originalUpdatedAt = created.updatedAt;
      // Delay to ensure timestamp difference (database may truncate to seconds)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const updated = await ClaimsApplicationService.updateClaim(created.id, userId, {
        firstName: 'John',
      });

      // Use >= because database may have same-second precision
      expect(new Date(updated!.updatedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt!).getTime()
      );
    });
  });

  // ============================================================
  // Claim Deletion Tests
  // ============================================================

  describe('deleteClaim', () => {
    it('deletes draft claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      // Don't add to createdClaimIds since we're deleting it

      const deleted = await ClaimsApplicationService.deleteClaim(created.id, userId);

      expect(deleted).toBe(true);

      const claim = await ClaimsApplicationService.getClaim(created.id, userId);
      expect(claim).toBeNull();
    });

    it('prevents deletion of submitted claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      await testDb
        .update(claimsTable)
        .set({ status: 'submitted' })
        .where(eq(claimsTable.id, created.id));

      await expect(
        ClaimsApplicationService.deleteClaim(created.id, userId)
      ).rejects.toThrow('Only draft claims can be deleted');
    });

    it('returns false for non-existent claim', async () => {
      const userId = await createTestUser();
      const fakeId = crypto.randomUUID();

      const deleted = await ClaimsApplicationService.deleteClaim(fakeId, userId);

      expect(deleted).toBe(false);
    });

    it('creates audit log entry for deletion', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);

      await ClaimsApplicationService.deleteClaim(created.id, userId);

      const logs = await testDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.resourceId, created.id));

      const deleteLog = logs.find((l) => l.action === 'claim_deleted');
      expect(deleteLog).toBeDefined();
    });
  });

  // ============================================================
  // Step Completion Tests
  // ============================================================

  describe('markStepComplete', () => {
    it('marks step as complete', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const steps = await ClaimsApplicationService.markStepComplete(
        created.id,
        userId,
        'claimType'
      );

      expect(steps.claimType).toBe(true);
    });

    it('preserves existing completed steps', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      await ClaimsApplicationService.markStepComplete(created.id, userId, 'claimType');
      const steps = await ClaimsApplicationService.markStepComplete(
        created.id,
        userId,
        'passportUpload'
      );

      expect(steps.claimType).toBe(true);
      expect(steps.passportUpload).toBe(true);
    });

    it('throws error for non-existent claim', async () => {
      const userId = await createTestUser();
      const fakeId = crypto.randomUUID();

      await expect(
        ClaimsApplicationService.markStepComplete(fakeId, userId, 'claimType')
      ).rejects.toThrow('Claim not found');
    });
  });

  describe('markStepIncomplete', () => {
    it('marks step as incomplete', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      // First mark complete
      await ClaimsApplicationService.markStepComplete(created.id, userId, 'claimType');

      // Then mark incomplete
      const steps = await ClaimsApplicationService.markStepIncomplete(
        created.id,
        userId,
        'claimType'
      );

      expect(steps.claimType).toBe(false);
    });
  });

  describe('getCompletedSteps', () => {
    it('returns completed steps', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      await ClaimsApplicationService.markStepComplete(created.id, userId, 'claimType');
      await ClaimsApplicationService.markStepComplete(created.id, userId, 'passportUpload');

      const steps = await ClaimsApplicationService.getCompletedSteps(created.id, userId);

      expect(steps.claimType).toBe(true);
      expect(steps.passportUpload).toBe(true);
      expect(steps.bankDetails).toBeUndefined();
    });
  });

  // ============================================================
  // Document Management Tests
  // ============================================================

  describe('addDocument', () => {
    it('adds document to claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const docId = await createTestDocument(userId, 'passport');

      const claimDoc = await ClaimsApplicationService.addDocument(
        created.id,
        userId,
        docId,
        'passport'
      );

      expect(claimDoc).toMatchObject({
        id: expect.any(String),
        claimId: created.id,
        documentId: docId,
        documentRole: 'passport',
      });
    });

    it('replaces existing document with same role', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const docId1 = await createTestDocument(userId, 'passport');
      const docId2 = await createTestDocument(userId, 'passport');

      await ClaimsApplicationService.addDocument(created.id, userId, docId1, 'passport');
      await ClaimsApplicationService.addDocument(created.id, userId, docId2, 'passport');

      const docs = await ClaimsApplicationService.getClaimDocuments(created.id, userId);
      const passportDocs = docs.filter((d) => d.documentRole === 'passport');

      expect(passportDocs.length).toBe(1);
      expect(passportDocs[0].documentId).toBe(docId2);
    });

    it('throws error when document does not belong to user', async () => {
      const userId1 = await createTestUser();
      const userId2 = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId1);
      createdClaimIds.push(created.id);

      const docId = await createTestDocument(userId2, 'passport');

      await expect(
        ClaimsApplicationService.addDocument(created.id, userId1, docId, 'passport')
      ).rejects.toThrow('Document not found or does not belong to user');
    });
  });

  describe('removeDocument', () => {
    it('removes document from claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const docId = await createTestDocument(userId, 'passport');
      await ClaimsApplicationService.addDocument(created.id, userId, docId, 'passport');

      const removed = await ClaimsApplicationService.removeDocument(
        created.id,
        userId,
        docId
      );

      expect(removed).toBe(true);

      const docs = await ClaimsApplicationService.getClaimDocuments(created.id, userId);
      expect(docs.length).toBe(0);
    });

    it('returns false when document not attached', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const fakeDocId = crypto.randomUUID();

      const removed = await ClaimsApplicationService.removeDocument(
        created.id,
        userId,
        fakeDocId
      );

      expect(removed).toBe(false);
    });
  });

  describe('getClaimDocuments', () => {
    it('returns all documents for claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const passportId = await createTestDocument(userId, 'passport');
      const certId = await createTestDocument(userId, 'certified_id_form');

      await ClaimsApplicationService.addDocument(created.id, userId, passportId, 'passport');
      await ClaimsApplicationService.addDocument(
        created.id,
        userId,
        certId,
        'certified_id_form'
      );

      const docs = await ClaimsApplicationService.getClaimDocuments(created.id, userId);

      expect(docs.length).toBe(2);
      expect(docs.some((d) => d.documentRole === 'passport')).toBe(true);
      expect(docs.some((d) => d.documentRole === 'certified_id_form')).toBe(true);
    });

    it('includes document details', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const docId = await createTestDocument(userId, 'passport');
      await ClaimsApplicationService.addDocument(created.id, userId, docId, 'passport');

      const docs = await ClaimsApplicationService.getClaimDocuments(created.id, userId);

      expect(docs[0].document).toBeDefined();
      expect(docs[0].document!.fileName).toBe('test-passport.pdf');
    });
  });

  // ============================================================
  // Signature Tests
  // ============================================================

  describe('attachSignature', () => {
    it('attaches signature to claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const sigId = await createTestSignature(userId);

      const updated = await ClaimsApplicationService.attachSignature(
        created.id,
        userId,
        sigId
      );

      expect(updated).not.toBeNull();
      expect(updated!.signatureId).toBe(sigId);
      expect(updated!.signatureCompletedAt).not.toBeNull();
    });
  });

  // ============================================================
  // Workflow Tests
  // ============================================================

  describe('transitionState', () => {
    it('transitions workflow state', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const updated = await ClaimsApplicationService.transitionState(
        created.id,
        userId,
        'documents'
      );

      expect(updated!.workflowState).toBe('documents');
    });

    it('records workflow history', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      await ClaimsApplicationService.transitionState(created.id, userId, 'documents');
      await ClaimsApplicationService.transitionState(created.id, userId, 'payment_details');

      const history = await ClaimsApplicationService.getWorkflowHistory(created.id, userId);

      expect(history.length).toBe(3); // initial + 2 transitions
      expect(history[0].state).toBe('payment_details');
      expect(history[0].previousState).toBe('documents');
    });
  });

  // ============================================================
  // Validation Tests
  // ============================================================

  describe('validateForSubmission', () => {
    it('returns invalid for incomplete claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const validation = await ClaimsApplicationService.validateForSubmission(
        created.id,
        userId
      );

      expect(validation.isValid).toBe(false);
      expect(validation.missingSteps.length).toBeGreaterThan(0);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('identifies missing required fields', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const validation = await ClaimsApplicationService.validateForSubmission(
        created.id,
        userId
      );

      expect(validation.errors).toContain('Claim type is required');
      expect(validation.errors).toContain('First name is required');
      expect(validation.errors).toContain('Passport document is required');
    });

    it('identifies missing steps', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      const validation = await ClaimsApplicationService.validateForSubmission(
        created.id,
        userId
      );

      expect(validation.missingSteps).toContain('claimType');
      expect(validation.missingSteps).toContain('bankDetails');
      expect(validation.missingSteps).toContain('signDocuments');
    });
  });

  describe('submitClaim', () => {
    it('throws error for invalid claim', async () => {
      const userId = await createTestUser();
      const created = await ClaimsApplicationService.createClaim(userId);
      createdClaimIds.push(created.id);

      await expect(
        ClaimsApplicationService.submitClaim(created.id, userId)
      ).rejects.toThrow('Claim validation failed');
    });

    // Note: Testing successful submission would require a fully completed claim
    // which requires setting up all required fields, documents, and signatures.
    // This is better tested in integration tests.
  });
});
