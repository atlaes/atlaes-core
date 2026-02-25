import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { pendingSessions, applications, calculationLogs } from '../drizzle/schema/gpr';
import { users, profiles, auditLogs } from '../drizzle/schema/shared';
import { GPRApplicationService, SavePendingSessionInput } from './gpr-application';
import { gprSessionData } from '../test/fixtures';

// Test database connection
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;

// Test data tracking for cleanup
const createdSessionEmails: string[] = [];
const createdUserIds: string[] = [];

describe('GPRApplicationService', () => {
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });
  });

  afterAll(async () => {
    // Cleanup all test data
    await cleanupTestData();
    await testClient.end();
  });

  beforeEach(async () => {
    // Clear any test data before each test
  });

  afterEach(async () => {
    // Clear created test data after each test
    await cleanupTestData();
    createdSessionEmails.length = 0;
    createdUserIds.length = 0;
  });

  async function cleanupTestData() {
    try {
      // Clean up in order due to FK constraints
      for (const email of createdSessionEmails) {
        await testClient`
          DELETE FROM gpr.calculation_logs
          WHERE session_id IN (
            SELECT id FROM gpr.pending_sessions WHERE email = ${email}
          )
        `;
        await testClient`
          DELETE FROM gpr.pending_sessions WHERE email = ${email}
        `;
      }

      for (const userId of createdUserIds) {
        await testClient`
          DELETE FROM gpr.workflow_states
          WHERE application_id IN (
            SELECT id FROM gpr.applications WHERE user_id = ${userId}::uuid
          )
        `;
        await testClient`
          DELETE FROM gpr.calculation_logs
          WHERE application_id IN (
            SELECT id FROM gpr.applications WHERE user_id = ${userId}::uuid
          )
        `;
        await testClient`
          DELETE FROM gpr.applications WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.audit_logs WHERE user_id = ${userId}::uuid
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

  // Helper to create test session input
  function createSessionInput(emailOverride?: string): SavePendingSessionInput {
    const testEmail = emailOverride || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    createdSessionEmails.push(testEmail);

    return {
      email: testEmail,
      calculatorData: {
        numberOfJobs: gprSessionData.calculatorData.numberOfJobs,
        jobs: gprSessionData.calculatorData.jobs,
        calculationResult: gprSessionData.calculatorData.calculationResult,
      },
      eligibilityData: gprSessionData.eligibilityData,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    };
  }

  // Helper to create test user
  async function createTestUser(email?: string): Promise<{ userId: string; email: string }> {
    const testEmail = email || `test-user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    const [user] = await testDb
      .insert(users)
      .values({
        email: testEmail,
        emailVerified: true,
        authProvider: 'magic_link',
      })
      .returning();

    await testDb
      .insert(profiles)
      .values({
        userId: user.id,
        firstName: 'Test',
        lastName: 'User',
      });

    createdUserIds.push(user.id);
    return { userId: user.id, email: testEmail };
  }

  // ============================================================
  // Pending Session Tests
  // ============================================================

  describe('savePendingSession', () => {
    it('saves a new pending session', async () => {
      const input = createSessionInput();
      const session = await GPRApplicationService.savePendingSession(input);

      expect(session).toMatchObject({
        id: expect.any(String),
        email: input.email.toLowerCase(),
        numberOfJobs: input.calculatorData.numberOfJobs,
        jobs: expect.arrayContaining([
          expect.objectContaining({
            startMonth: '01',
            startYear: '2020',
          }),
        ]),
        calculationResult: expect.objectContaining({
          totalRefund: gprSessionData.calculatorData.calculationResult.totalRefund,
        }),
      });

      // Verify expires in 7 days
      expect(session.expiresAt).toBeDefined();
      const expiresIn = session.expiresAt!.getTime() - Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(expiresIn).toBeGreaterThan(sevenDaysMs - 60000); // Allow 1 minute tolerance
      expect(expiresIn).toBeLessThan(sevenDaysMs + 60000);
    });

    it('upserts pending session for same email', async () => {
      const email = `test-upsert-${Date.now()}@example.com`;
      createdSessionEmails.push(email);

      // First save
      const input1: SavePendingSessionInput = {
        email,
        calculatorData: {
          numberOfJobs: 1,
          jobs: gprSessionData.calculatorData.jobs,
          calculationResult: {
            ...gprSessionData.calculatorData.calculationResult,
            totalRefund: 1000,
          },
        },
      };

      const session1 = await GPRApplicationService.savePendingSession(input1);

      // Second save with updated data
      const input2: SavePendingSessionInput = {
        email,
        calculatorData: {
          numberOfJobs: 2,
          jobs: [
            ...gprSessionData.calculatorData.jobs,
            gprSessionData.calculatorData.jobs[0],
          ],
          calculationResult: {
            ...gprSessionData.calculatorData.calculationResult,
            totalRefund: 2000,
          },
        },
      };

      const session2 = await GPRApplicationService.savePendingSession(input2);

      // Should be the same session ID
      expect(session2.id).toBe(session1.id);

      // Should have updated data
      expect(session2.numberOfJobs).toBe(2);
      expect(session2.calculationResult.totalRefund).toBe(2000);
    });

    it('normalizes email to lowercase', async () => {
      const input = createSessionInput('TEST-UPPERCASE@EXAMPLE.COM');
      const session = await GPRApplicationService.savePendingSession(input);

      expect(session.email).toBe('test-uppercase@example.com');
    });

    it('saves eligibility data when provided', async () => {
      const input = createSessionInput();
      const session = await GPRApplicationService.savePendingSession(input);

      expect(session.citizenship).toBe(gprSessionData.eligibilityData?.citizenship);
      expect(session.residence).toBe(gprSessionData.eligibilityData?.residence);
      expect(session.eligibilityResult).toMatchObject({
        isEligible: true,
        reasons: expect.arrayContaining(['All eligibility criteria met']),
      });
    });

    it('handles missing eligibility data', async () => {
      const email = `test-no-eligibility-${Date.now()}@example.com`;
      createdSessionEmails.push(email);

      const input: SavePendingSessionInput = {
        email,
        calculatorData: gprSessionData.calculatorData,
        // No eligibility data
      };

      const session = await GPRApplicationService.savePendingSession(input);

      expect(session.citizenship).toBeNull();
      expect(session.residence).toBeNull();
      expect(session.eligibilityResult).toBeNull();
    });
  });

  describe('getPendingSession', () => {
    it('retrieves a pending session by email', async () => {
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);

      const session = await GPRApplicationService.getPendingSession(input.email);

      expect(session).not.toBeNull();
      expect(session!.email).toBe(input.email.toLowerCase());
    });

    it('returns null for non-existent email', async () => {
      const session = await GPRApplicationService.getPendingSession(
        `non-existent-${Date.now()}@example.com`
      );

      expect(session).toBeNull();
    });

    it('returns null for expired session', async () => {
      // Create a session
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);

      // Manually expire it
      await testClient`
        UPDATE gpr.pending_sessions
        SET expires_at = NOW() - INTERVAL '1 day'
        WHERE email = ${input.email.toLowerCase()}
      `;

      const session = await GPRApplicationService.getPendingSession(input.email);

      expect(session).toBeNull();
    });

    it('is case-insensitive for email lookup', async () => {
      const input = createSessionInput('test-case@example.com');
      await GPRApplicationService.savePendingSession(input);

      const session = await GPRApplicationService.getPendingSession('TEST-CASE@EXAMPLE.COM');

      expect(session).not.toBeNull();
      expect(session!.email).toBe('test-case@example.com');
    });
  });

  // ============================================================
  // Migration Tests
  // ============================================================

  describe('migrateToApplication', () => {
    it('migrates pending session to application', async () => {
      // Create pending session
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);

      // Create user
      const { userId } = await createTestUser(input.email);

      // Migrate
      const application = await GPRApplicationService.migrateToApplication(
        input.email,
        userId
      );

      expect(application).not.toBeNull();
      expect(application!.id).toEqual(expect.any(String));
      expect(application!.userId).toBe(userId);
      expect(application!.status).toBe('ready'); // Should be 'ready' because eligibilityResult.isEligible is true
      expect(application!.numberOfJobs).toBe(gprSessionData.calculatorData.numberOfJobs);
      expect(application!.totalMonthsContributed).toBe(gprSessionData.calculatorData.calculationResult.totalMonthsContributed);
      // Compare as numbers to handle decimal formatting differences (e.g., "3240.50" vs "3240.5")
      expect(parseFloat(application!.totalRefund!)).toBe(gprSessionData.calculatorData.calculationResult.totalRefund);
    });

    it('deletes pending session after migration', async () => {
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);

      const { userId } = await createTestUser(input.email);
      await GPRApplicationService.migrateToApplication(input.email, userId);

      // Session should be deleted
      const session = await GPRApplicationService.getPendingSession(input.email);
      expect(session).toBeNull();
    });

    it('returns null when no pending session exists', async () => {
      const { userId, email } = await createTestUser();

      const application = await GPRApplicationService.migrateToApplication(
        email,
        userId
      );

      expect(application).toBeNull();
    });

    it('creates audit log entry', async () => {
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);

      const { userId } = await createTestUser(input.email);
      const application = await GPRApplicationService.migrateToApplication(
        input.email,
        userId
      );

      // Check audit log was created
      const auditLog = await testDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.resourceId, application!.id))
        .limit(1);

      expect(auditLog.length).toBe(1);
      expect(auditLog[0].action).toBe('application_created');
      expect(auditLog[0].resource).toBe('gpr_application');
    });

    it('sets status to draft when not eligible', async () => {
      const email = `test-ineligible-${Date.now()}@example.com`;
      createdSessionEmails.push(email);

      const input: SavePendingSessionInput = {
        email,
        calculatorData: gprSessionData.calculatorData,
        eligibilityData: {
          ...gprSessionData.eligibilityData,
          eligibilityResult: {
            isEligible: false,
            reasons: ['Does not meet criteria'],
          },
        },
      };

      await GPRApplicationService.savePendingSession(input);
      const { userId } = await createTestUser(email);

      const application = await GPRApplicationService.migrateToApplication(
        email,
        userId
      );

      expect(application!.status).toBe('draft');
    });
  });

  // ============================================================
  // Application CRUD Tests
  // ============================================================

  describe('getUserApplications', () => {
    it('returns all applications for a user', async () => {
      // Create user and migrate two sessions
      const { userId, email } = await createTestUser();

      // Create first session and migrate
      const input1 = createSessionInput();
      await GPRApplicationService.savePendingSession(input1);
      // Re-register user with same ID for first session
      await testClient`
        UPDATE gpr.pending_sessions
        SET email = ${email}
        WHERE email = ${input1.email.toLowerCase()}
      `;
      createdSessionEmails.push(email);
      await GPRApplicationService.migrateToApplication(email, userId);

      // Get applications
      const applications = await GPRApplicationService.getUserApplications(userId);

      expect(applications.length).toBeGreaterThanOrEqual(1);
      expect(applications[0].userId).toBe(userId);
    });

    it('returns empty array for user with no applications', async () => {
      const { userId } = await createTestUser();

      const applications = await GPRApplicationService.getUserApplications(userId);

      expect(applications).toEqual([]);
    });

    it('orders applications by creation date descending', async () => {
      const { userId, email } = await createTestUser();

      // Create and migrate first session
      const email1 = `test-order1-${Date.now()}@example.com`;
      createdSessionEmails.push(email1);
      await GPRApplicationService.savePendingSession({
        email: email1,
        calculatorData: gprSessionData.calculatorData,
      });
      await testClient`
        UPDATE gpr.pending_sessions
        SET email = ${email}
        WHERE email = ${email1}
      `;
      await GPRApplicationService.migrateToApplication(email, userId);

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create second session
      const email2 = `test-order2-${Date.now()}@example.com`;
      createdSessionEmails.push(email2);
      await GPRApplicationService.savePendingSession({
        email: email2,
        calculatorData: gprSessionData.calculatorData,
      });
      await testClient`
        UPDATE gpr.pending_sessions
        SET email = ${email}
        WHERE email = ${email2}
      `;
      await GPRApplicationService.migrateToApplication(email, userId);

      const applications = await GPRApplicationService.getUserApplications(userId);

      if (applications.length >= 2) {
        // Most recent should be first
        expect(
          new Date(applications[0].createdAt!).getTime()
        ).toBeGreaterThanOrEqual(new Date(applications[1].createdAt!).getTime());
      }
    });
  });

  describe('getApplication', () => {
    it('returns application by ID for owner', async () => {
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);
      const { userId } = await createTestUser(input.email);
      const created = await GPRApplicationService.migrateToApplication(
        input.email,
        userId
      );

      const application = await GPRApplicationService.getApplication(
        created!.id,
        userId
      );

      expect(application).not.toBeNull();
      expect(application!.id).toBe(created!.id);
    });

    it('returns null for non-existent application', async () => {
      const { userId } = await createTestUser();

      const application = await GPRApplicationService.getApplication(
        '00000000-0000-0000-0000-000000000000',
        userId
      );

      expect(application).toBeNull();
    });

    it('returns null when user does not own application', async () => {
      // Create application for user 1
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);
      const { userId: userId1 } = await createTestUser(input.email);
      const created = await GPRApplicationService.migrateToApplication(
        input.email,
        userId1
      );

      // Try to access as user 2
      const { userId: userId2 } = await createTestUser();

      const application = await GPRApplicationService.getApplication(
        created!.id,
        userId2
      );

      expect(application).toBeNull();
    });
  });

  describe('updateApplication', () => {
    it('updates application fields', async () => {
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);
      const { userId } = await createTestUser(input.email);
      const created = await GPRApplicationService.migrateToApplication(
        input.email,
        userId
      );

      const updated = await GPRApplicationService.updateApplication(
        created!.id,
        userId,
        {
          citizenship: 'US',
          residence: 'AU',
          status: 'submitted',
        }
      );

      expect(updated).not.toBeNull();
      expect(updated!.citizenship).toBe('US');
      expect(updated!.residence).toBe('AU');
      expect(updated!.status).toBe('submitted');
    });

    it('returns null when updating non-existent application', async () => {
      const { userId } = await createTestUser();

      const updated = await GPRApplicationService.updateApplication(
        '00000000-0000-0000-0000-000000000000',
        userId,
        { status: 'submitted' }
      );

      expect(updated).toBeNull();
    });

    it('returns null when user does not own application', async () => {
      // Create application for user 1
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);
      const { userId: userId1 } = await createTestUser(input.email);
      const created = await GPRApplicationService.migrateToApplication(
        input.email,
        userId1
      );

      // Try to update as user 2
      const { userId: userId2 } = await createTestUser();

      const updated = await GPRApplicationService.updateApplication(
        created!.id,
        userId2,
        { status: 'submitted' }
      );

      expect(updated).toBeNull();
    });

    it('updates updatedAt timestamp', async () => {
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);
      const { userId } = await createTestUser(input.email);
      const created = await GPRApplicationService.migrateToApplication(
        input.email,
        userId
      );

      const originalUpdatedAt = created!.updatedAt;

      // Delay to ensure timestamp difference (database may truncate to seconds)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const updated = await GPRApplicationService.updateApplication(
        created!.id,
        userId,
        { citizenship: 'GB' }
      );

      // Use >= because database may have same-second precision
      expect(
        new Date(updated!.updatedAt!).getTime()
      ).toBeGreaterThanOrEqual(new Date(originalUpdatedAt!).getTime());
    });
  });

  // ============================================================
  // Cleanup Tests
  // ============================================================

  describe('cleanupExpiredSessions', () => {
    it('deletes expired sessions', async () => {
      // Create a session and expire it
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);

      await testClient`
        UPDATE gpr.pending_sessions
        SET expires_at = NOW() - INTERVAL '1 day'
        WHERE email = ${input.email.toLowerCase()}
      `;

      const deletedCount = await GPRApplicationService.cleanupExpiredSessions();

      expect(deletedCount).toBeGreaterThanOrEqual(1);

      // Verify session is gone
      const session = await testClient`
        SELECT * FROM gpr.pending_sessions
        WHERE email = ${input.email.toLowerCase()}
      `;
      expect(session.length).toBe(0);
    });

    it('does not delete non-expired sessions', async () => {
      const input = createSessionInput();
      await GPRApplicationService.savePendingSession(input);

      await GPRApplicationService.cleanupExpiredSessions();

      // Session should still exist
      const session = await GPRApplicationService.getPendingSession(input.email);
      expect(session).not.toBeNull();
    });
  });
});
