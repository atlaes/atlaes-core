/**
 * Integration Tests: Complete User Journey
 *
 * These tests cover the full flow from:
 * 1. Calculator (anonymous) → Session save
 * 2. Magic link request → User creation
 * 3. Session migration → GPR Application
 * 4. Claim creation → Form completion → Submission
 *
 * These are end-to-end tests that verify the entire system works together.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { users, profiles, documents, signatures } from '../drizzle/schema/shared';
import { pendingSessions, applications } from '../drizzle/schema/gpr';
import { claimsTable } from '../drizzle/schema/claims';

// Import routes
import auth from '../routes/auth';
import gpr from '../routes/gpr';
import claims from '../routes/claims';

import { gprSessionData, completeClaim, claimPersonalInfo, claimCurrentAddress, claimBankDetails } from '../test/fixtures';

// Test database connection
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;

// Track created data for cleanup
const createdUserEmails: string[] = [];

describe('User Journey Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });

    // Create full app with all routes
    app = new Hono();
    app.route('/api/auth', auth);
    app.route('/api/gpr', gpr);
    app.route('/api/claims', claims);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  afterEach(async () => {
    await cleanupTestData();
    createdUserEmails.length = 0;
  });

  async function cleanupTestData() {
    try {
      for (const email of createdUserEmails) {
        const normalizedEmail = email.toLowerCase();

        // Get user ID first
        const userResult = await testClient`
          SELECT id FROM shared.users WHERE email = ${normalizedEmail}
        `;

        if (userResult.length > 0) {
          const userId = userResult[0].id;

          // Delete in order due to FK constraints
          await testClient`
            DELETE FROM claims.claim_documents
            WHERE claim_id IN (SELECT id FROM claims.claims WHERE user_id = ${userId}::uuid)
          `;
          await testClient`
            DELETE FROM claims.claim_workflow_states
            WHERE claim_id IN (SELECT id FROM claims.claims WHERE user_id = ${userId}::uuid)
          `;
          await testClient`
            DELETE FROM claims.claims WHERE user_id = ${userId}::uuid
          `;
          await testClient`
            DELETE FROM gpr.workflow_states
            WHERE application_id IN (SELECT id FROM gpr.applications WHERE user_id = ${userId}::uuid)
          `;
          await testClient`
            DELETE FROM gpr.calculation_logs
            WHERE application_id IN (SELECT id FROM gpr.applications WHERE user_id = ${userId}::uuid)
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

        // Also clean up pending sessions
        await testClient`
          DELETE FROM gpr.calculation_logs
          WHERE session_id IN (SELECT id FROM gpr.pending_sessions WHERE email = ${normalizedEmail})
        `;
        await testClient`
          DELETE FROM gpr.pending_sessions WHERE email = ${normalizedEmail}
        `;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Helper to make requests
  async function request(
    method: string,
    path: string,
    body?: object,
    headers?: Record<string, string>
  ) {
    const req = new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return app.fetch(req);
  }

  function uniqueEmail(): string {
    const email = `journey-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    createdUserEmails.push(email);
    return email;
  }

  // ============================================================
  // Scenario 1: Complete Happy Path
  // Calculator → Magic Link → Claims
  // ============================================================

  describe('Scenario 1: Calculator → Magic Link → Claims (Happy Path)', () => {
    it('completes the full user journey from calculator to claim creation', async () => {
      const email = uniqueEmail();

      // Step 1: Anonymous user uses the calculator
      console.log('Step 1: Calculator calculation');
      const calcRes = await request('POST', '/api/gpr/calculate-simple', {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 4500,
            sector: 'private',
            state: 'bayern',
          },
        ],
      });
      const calcData = await calcRes.json();

      expect(calcRes.status).toBe(200);
      expect(calcData.success).toBe(true);
      expect(calcData.calculation.totalMonthsContributed).toBe(30);
      expect(calcData.calculation.isEligible).toBe(true);

      // Step 2: User requests magic link with GPR session data
      console.log('Step 2: Magic link request with session data');
      const magicLinkRes = await request('POST', '/api/auth/magic-link/request', {
        email,
        gprSessionData: {
          calculatorData: gprSessionData.calculatorData,
          eligibilityData: gprSessionData.eligibilityData,
        },
      });
      const magicLinkData = await magicLinkRes.json();

      expect(magicLinkRes.status).toBe(200);
      expect(magicLinkData.magicLink).toBeDefined();

      // Verify session was saved
      const sessionRes = await request('GET', `/api/gpr/session/${encodeURIComponent(email)}`);
      const sessionData = await sessionRes.json();

      expect(sessionRes.status).toBe(200);
      expect(sessionData.session.email).toBe(email.toLowerCase());

      // Step 3: User clicks magic link to verify
      console.log('Step 3: Magic link verification');
      const token = new URL(magicLinkData.magicLink).searchParams.get('token');
      const verifyRes = await request('POST', '/api/auth/magic-link/verify', { token });
      const verifyData = await verifyRes.json() as any;

      expect(verifyRes.status).toBe(200);
      expect(verifyData.user.email).toBe(email);
      expect(verifyData.tokens.accessToken).toBeDefined();
      expect(verifyData.isNewUser).toBe(true);
      expect(verifyData.gprApplication).toBeDefined();
      // Compare as numbers to handle decimal formatting differences
      expect(parseFloat(verifyData.gprApplication.totalRefund)).toBe(
        gprSessionData.calculatorData.calculationResult.totalRefund
      );

      const authToken = verifyData.tokens.accessToken;
      const applicationId = verifyData.gprApplication.id;

      // Verify session was deleted after migration
      const sessionAfterRes = await request('GET', `/api/gpr/session/${encodeURIComponent(email)}`);
      expect(sessionAfterRes.status).toBe(404);

      // Step 4: User creates a claim linked to their GPR application
      console.log('Step 4: Create claim');
      const createClaimRes = await request(
        'POST',
        '/api/claims',
        { applicationId },
        { Authorization: `Bearer ${authToken}` }
      );
      const createClaimData = await createClaimRes.json() as any;

      expect(createClaimRes.status).toBe(200);
      expect(createClaimData.claim.applicationId).toBe(applicationId);
      expect(createClaimData.claim.status).toBe('draft');

      const claimId = createClaimData.claim.id;

      // Step 5: User fills out personal information
      console.log('Step 5: Fill personal info');
      const updatePersonalRes = await request(
        'PUT',
        `/api/claims/${claimId}`,
        claimPersonalInfo,
        { Authorization: `Bearer ${authToken}` }
      );
      const updatePersonalData = await updatePersonalRes.json();

      expect(updatePersonalRes.status).toBe(200);
      expect(updatePersonalData.claim.firstName).toBe(claimPersonalInfo.firstName);
      expect(updatePersonalData.claim.claimType).toBe(claimPersonalInfo.claimType);

      // Mark step complete
      await request(
        'PUT',
        `/api/claims/${claimId}/steps/claimType`,
        { completed: true },
        { Authorization: `Bearer ${authToken}` }
      );

      // Step 6: User fills out current address
      console.log('Step 6: Fill current address');
      const updateAddressRes = await request(
        'PUT',
        `/api/claims/${claimId}`,
        claimCurrentAddress,
        { Authorization: `Bearer ${authToken}` }
      );

      expect(updateAddressRes.status).toBe(200);

      await request(
        'PUT',
        `/api/claims/${claimId}/steps/currentAddress`,
        { completed: true },
        { Authorization: `Bearer ${authToken}` }
      );

      // Step 7: User fills out bank details
      console.log('Step 7: Fill bank details');
      const updateBankRes = await request(
        'PUT',
        `/api/claims/${claimId}`,
        claimBankDetails,
        { Authorization: `Bearer ${authToken}` }
      );

      expect(updateBankRes.status).toBe(200);

      await request(
        'PUT',
        `/api/claims/${claimId}/steps/bankDetails`,
        { completed: true },
        { Authorization: `Bearer ${authToken}` }
      );

      // Step 8: Verify user can get their claim
      console.log('Step 8: Verify claim retrieval');
      const getClaimRes = await request(
        'GET',
        `/api/claims/${claimId}`,
        undefined,
        { Authorization: `Bearer ${authToken}` }
      );
      const getClaimData = await getClaimRes.json();

      expect(getClaimRes.status).toBe(200);
      expect(getClaimData.claim.firstName).toBe(claimPersonalInfo.firstName);
      expect(getClaimData.claim.currentCity).toBe(claimCurrentAddress.currentCity);
      expect(getClaimData.claim.bankName).toBe(claimBankDetails.bankName);
      expect(getClaimData.claim.completedSteps.claimType).toBe(true);
      expect(getClaimData.claim.completedSteps.currentAddress).toBe(true);
      expect(getClaimData.claim.completedSteps.bankDetails).toBe(true);

      // Step 9: Verify GPR application is accessible
      console.log('Step 9: Verify GPR application');
      const getAppRes = await request(
        'GET',
        `/api/gpr/applications/${applicationId}`,
        undefined,
        { Authorization: `Bearer ${authToken}` }
      );
      const getAppData = await getAppRes.json();

      expect(getAppRes.status).toBe(200);
      expect(getAppData.application.id).toBe(applicationId);

      console.log('Journey completed successfully!');
    });
  });

  // ============================================================
  // Scenario 2: Returning User with Existing Session
  // ============================================================

  describe('Scenario 2: Returning User with Existing Session', () => {
    it('migrates existing session when returning user verifies magic link', async () => {
      const email = uniqueEmail();

      // Step 1: User uses calculator and saves session
      await request('POST', '/api/gpr/session', {
        email,
        calculatorData: gprSessionData.calculatorData,
        eligibilityData: gprSessionData.eligibilityData,
      });

      // Step 2: User leaves and comes back later, requests new magic link
      const magicLinkRes = await request('POST', '/api/auth/magic-link/request', {
        email,
        // No session data this time - using existing session
      });
      const magicLinkData = await magicLinkRes.json();

      expect(magicLinkRes.status).toBe(200);

      // Step 3: User verifies magic link
      const token = new URL(magicLinkData.magicLink).searchParams.get('token');
      const verifyRes = await request('POST', '/api/auth/magic-link/verify', { token });
      const verifyData = await verifyRes.json() as any;

      expect(verifyRes.status).toBe(200);
      expect(verifyData.gprApplication).toBeDefined();

      // The existing session should have been migrated
      // Compare as numbers to handle decimal formatting differences
      expect(parseFloat(verifyData.gprApplication.totalRefund)).toBe(
        gprSessionData.calculatorData.calculationResult.totalRefund
      );
    });
  });

  // ============================================================
  // Scenario 3: Multiple Calculator Submissions
  // ============================================================

  describe('Scenario 3: Multiple Calculator Submissions (Upsert)', () => {
    it('updates session on repeated calculator submissions', async () => {
      const email = uniqueEmail();

      // First submission
      await request('POST', '/api/gpr/session', {
        email,
        calculatorData: {
          ...gprSessionData.calculatorData,
          calculationResult: {
            ...gprSessionData.calculatorData.calculationResult,
            totalRefund: 1000,
          },
        },
      });

      // Check first value
      let sessionRes = await request('GET', `/api/gpr/session/${encodeURIComponent(email)}`);
      let sessionData = await sessionRes.json();
      expect(sessionData.session.totalRefund).toBe(1000);

      // Second submission with updated calculation
      await request('POST', '/api/gpr/session', {
        email,
        calculatorData: {
          ...gprSessionData.calculatorData,
          numberOfJobs: 2,
          calculationResult: {
            ...gprSessionData.calculatorData.calculationResult,
            totalRefund: 2500,
          },
        },
      });

      // Check updated value
      sessionRes = await request('GET', `/api/gpr/session/${encodeURIComponent(email)}`);
      sessionData = await sessionRes.json();
      expect(sessionData.session.totalRefund).toBe(2500);
      expect(sessionData.session.numberOfJobs).toBe(2);
    });
  });

  // ============================================================
  // Scenario 4: User Without Session
  // ============================================================

  describe('Scenario 4: User Without Prior Session', () => {
    it('allows user registration without GPR session', async () => {
      const email = uniqueEmail();

      // Request magic link without session data
      const magicLinkRes = await request('POST', '/api/auth/magic-link/request', {
        email,
      });
      const magicLinkData = await magicLinkRes.json();

      expect(magicLinkRes.status).toBe(200);

      // Verify magic link
      const token = new URL(magicLinkData.magicLink).searchParams.get('token');
      const verifyRes = await request('POST', '/api/auth/magic-link/verify', { token });
      const verifyData = await verifyRes.json();

      expect(verifyRes.status).toBe(200);
      expect(verifyData.user.email).toBe(email);
      expect(verifyData.gprApplication).toBeNull(); // No session to migrate

      // User can still create a claim without GPR application
      const authToken = verifyData.tokens.accessToken;
      const claimRes = await request(
        'POST',
        '/api/claims',
        {},
        { Authorization: `Bearer ${authToken}` }
      );
      const claimData = await claimRes.json() as any;

      expect(claimRes.status).toBe(200);
      expect(claimData.claim.applicationId).toBeNull();
    });
  });

  // ============================================================
  // Scenario 5: Claim State Persistence
  // ============================================================

  describe('Scenario 5: Claim State Persistence', () => {
    it('persists claim progress across sessions', async () => {
      const email = uniqueEmail();

      // Create user and claim
      const magicLinkRes = await request('POST', '/api/auth/magic-link/request', { email });
      const token1 = new URL((await magicLinkRes.json()).magicLink).searchParams.get('token');
      const verifyRes1 = await request('POST', '/api/auth/magic-link/verify', { token: token1 });
      const verifyData1 = await verifyRes1.json();

      const authToken1 = verifyData1.tokens.accessToken;

      // Create and partially fill claim
      const claimRes = await request(
        'POST',
        '/api/claims',
        {},
        { Authorization: `Bearer ${authToken1}` }
      );
      const claimId = (await claimRes.json()).claim.id;

      await request(
        'PUT',
        `/api/claims/${claimId}`,
        claimPersonalInfo,
        { Authorization: `Bearer ${authToken1}` }
      );

      await request(
        'PUT',
        `/api/claims/${claimId}/steps/claimType`,
        { completed: true },
        { Authorization: `Bearer ${authToken1}` }
      );

      // Simulate new session (new magic link)
      const magicLinkRes2 = await request('POST', '/api/auth/magic-link/request', { email });
      const token2 = new URL((await magicLinkRes2.json()).magicLink).searchParams.get('token');
      const verifyRes2 = await request('POST', '/api/auth/magic-link/verify', { token: token2 });
      const verifyData2 = await verifyRes2.json();

      const authToken2 = verifyData2.tokens.accessToken;

      // Verify claim state is preserved
      const getClaimRes = await request(
        'GET',
        `/api/claims/${claimId}`,
        undefined,
        { Authorization: `Bearer ${authToken2}` }
      );
      const getClaimData = await getClaimRes.json();

      expect(getClaimRes.status).toBe(200);
      expect(getClaimData.claim.firstName).toBe(claimPersonalInfo.firstName);
      expect(getClaimData.claim.completedSteps.claimType).toBe(true);
    });
  });

  // ============================================================
  // Scenario 6: Cross-User Isolation
  // ============================================================

  describe('Scenario 6: Cross-User Data Isolation', () => {
    it('prevents users from accessing each other\'s claims', async () => {
      const email1 = uniqueEmail();
      const email2 = uniqueEmail();

      // Create user 1
      const ml1 = await request('POST', '/api/auth/magic-link/request', { email: email1 });
      const token1 = new URL((await ml1.json()).magicLink).searchParams.get('token');
      const verify1 = await request('POST', '/api/auth/magic-link/verify', { token: token1 });
      const authToken1 = (await verify1.json()).tokens.accessToken;

      // Create user 2
      const ml2 = await request('POST', '/api/auth/magic-link/request', { email: email2 });
      const token2 = new URL((await ml2.json()).magicLink).searchParams.get('token');
      const verify2 = await request('POST', '/api/auth/magic-link/verify', { token: token2 });
      const authToken2 = (await verify2.json()).tokens.accessToken;

      // User 1 creates a claim
      const claimRes = await request(
        'POST',
        '/api/claims',
        {},
        { Authorization: `Bearer ${authToken1}` }
      );
      const user1ClaimId = (await claimRes.json()).claim.id;

      // User 2 tries to access user 1's claim
      const accessRes = await request(
        'GET',
        `/api/claims/${user1ClaimId}`,
        undefined,
        { Authorization: `Bearer ${authToken2}` }
      );

      expect(accessRes.status).toBe(404);

      // User 2 tries to update user 1's claim
      const updateRes = await request(
        'PUT',
        `/api/claims/${user1ClaimId}`,
        { firstName: 'Hacker' },
        { Authorization: `Bearer ${authToken2}` }
      );

      expect(updateRes.status).toBe(404);

      // User 2 tries to delete user 1's claim
      const deleteRes = await request(
        'DELETE',
        `/api/claims/${user1ClaimId}`,
        undefined,
        { Authorization: `Bearer ${authToken2}` }
      );

      expect(deleteRes.status).toBe(404);

      // User 1 can still access their own claim
      const user1AccessRes = await request(
        'GET',
        `/api/claims/${user1ClaimId}`,
        undefined,
        { Authorization: `Bearer ${authToken1}` }
      );

      expect(user1AccessRes.status).toBe(200);
    });
  });

  // ============================================================
  // Scenario 7: Workflow Transitions
  // ============================================================

  describe('Scenario 7: Workflow State Transitions', () => {
    it('tracks workflow transitions correctly', async () => {
      const email = uniqueEmail();

      // Create user
      const ml = await request('POST', '/api/auth/magic-link/request', { email });
      const token = new URL((await ml.json()).magicLink).searchParams.get('token');
      const verify = await request('POST', '/api/auth/magic-link/verify', { token });
      const authToken = (await verify.json()).tokens.accessToken;

      // Create claim
      const claimRes = await request(
        'POST',
        '/api/claims',
        {},
        { Authorization: `Bearer ${authToken}` }
      );
      const claimId = (await claimRes.json()).claim.id;

      // Make several transitions (API uses POST for workflow transitions)
      await request(
        'POST',
        `/api/claims/${claimId}/workflow`,
        { state: 'documents' },
        { Authorization: `Bearer ${authToken}` }
      );

      await request(
        'POST',
        `/api/claims/${claimId}/workflow`,
        { state: 'payment_details' },
        { Authorization: `Bearer ${authToken}` }
      );

      await request(
        'POST',
        `/api/claims/${claimId}/workflow`,
        { state: 'signature' },
        { Authorization: `Bearer ${authToken}` }
      );

      // Get workflow history
      const historyRes = await request(
        'GET',
        `/api/claims/${claimId}/workflow/history`,
        undefined,
        { Authorization: `Bearer ${authToken}` }
      );
      const historyData = await historyRes.json();

      expect(historyRes.status).toBe(200);
      expect(historyData.history.length).toBe(4); // Initial + 3 transitions

      // Verify order (most recent first)
      expect(historyData.history[0].state).toBe('signature');
      expect(historyData.history[0].previousState).toBe('payment_details');
      expect(historyData.history[1].state).toBe('payment_details');
      expect(historyData.history[2].state).toBe('documents');
      expect(historyData.history[3].state).toBe('personal_info');
    });
  });
});
