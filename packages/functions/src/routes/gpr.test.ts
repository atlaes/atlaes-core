import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { users, profiles } from '../drizzle/schema/shared';
import { pendingSessions, applications } from '../drizzle/schema/gpr';
import gpr from './gpr';
import { AuthService } from '../utils/auth';
import { singleJobInput, gprSessionData } from '../test/fixtures';

// Test database connection
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;

// Tracking created test data
const createdUserIds: string[] = [];
const createdSessionEmails: string[] = [];

describe('GPR Routes', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });

    app = new Hono();
    app.route('/api/gpr', gpr);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  beforeEach(async () => {
    // Clear data
  });

  afterEach(async () => {
    await cleanupTestData();
    createdUserIds.length = 0;
    createdSessionEmails.length = 0;
  });

  async function cleanupTestData() {
    try {
      for (const email of createdSessionEmails) {
        await testClient`
          DELETE FROM gpr.calculation_logs
          WHERE session_id IN (SELECT id FROM gpr.pending_sessions WHERE email = ${email})
        `;
        await testClient`
          DELETE FROM gpr.pending_sessions WHERE email = ${email}
        `;
      }

      for (const userId of createdUserIds) {
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

  // Helper to create test user and get token
  async function createTestUserWithToken(): Promise<{ userId: string; token: string; email: string }> {
    const email = `test-gpr-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    const [user] = await testDb
      .insert(users)
      .values({
        email,
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

    const token = AuthService.generateTokens({
      userId: user.id,
      email: user.email,
      emailVerified: true,
    }).accessToken;

    return { userId: user.id, token, email };
  }

  function uniqueEmail(): string {
    return `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  }

  // ============================================================
  // Health Check Tests
  // ============================================================

  describe('GET /api/gpr/health', () => {
    it('returns healthy status', async () => {
      const res = await request('GET', '/api/gpr/health');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.service).toBe('GPR');
      expect(data.status).toBe('healthy');
    });
  });

  // ============================================================
  // Calculation Tests
  // ============================================================

  describe('POST /api/gpr/calculate-simple', () => {
    it('calculates refund for valid input', async () => {
      const res = await request('POST', '/api/gpr/calculate-simple', singleJobInput);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.calculation).toBeDefined();
      expect(data.calculation.totalMonthsContributed).toBe(30);
      expect(data.calculation.statePensionRefund).toBeGreaterThanOrEqual(0);
    });

    it('returns 400 for invalid date format', async () => {
      const res = await request('POST', '/api/gpr/calculate-simple', {
        jobs: [
          {
            startDate: '2020/01/01', // Wrong format
            endDate: '2022-06',
            monthlySalary: 4500,
            sector: 'private',
          },
        ],
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for empty jobs array', async () => {
      const res = await request('POST', '/api/gpr/calculate-simple', {
        jobs: [],
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for negative salary', async () => {
      const res = await request('POST', '/api/gpr/calculate-simple', {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: -1000,
            sector: 'private',
          },
        ],
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request('POST', '/api/gpr/calculate-simple', {
        jobs: [
          {
            startDate: '2020-01',
            // Missing endDate, monthlySalary, sector
          },
        ],
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // Session Management Tests
  // ============================================================

  describe('POST /api/gpr/session', () => {
    it('saves pending session', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      const res = await request('POST', '/api/gpr/session', {
        email,
        calculatorData: gprSessionData.calculatorData,
        eligibilityData: gprSessionData.eligibilityData,
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
    });

    it('upserts session for same email', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      // First save
      const res1 = await request('POST', '/api/gpr/session', {
        email,
        calculatorData: {
          ...gprSessionData.calculatorData,
          calculationResult: {
            ...gprSessionData.calculatorData.calculationResult,
            totalRefund: 1000,
          },
        },
      });
      const data1 = await res1.json();

      // Second save
      const res2 = await request('POST', '/api/gpr/session', {
        email,
        calculatorData: {
          ...gprSessionData.calculatorData,
          calculationResult: {
            ...gprSessionData.calculatorData.calculationResult,
            totalRefund: 2000,
          },
        },
      });
      const data2 = await res2.json();

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(data2.sessionId).toBe(data1.sessionId); // Same session ID
    });

    it('returns 400 for invalid email', async () => {
      const res = await request('POST', '/api/gpr/session', {
        email: 'invalid-email',
        calculatorData: gprSessionData.calculatorData,
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing calculator data', async () => {
      const res = await request('POST', '/api/gpr/session', {
        email: uniqueEmail(),
        // Missing calculatorData
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/gpr/session/:email', () => {
    it('retrieves existing session', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      // Create session first
      await request('POST', '/api/gpr/session', {
        email,
        calculatorData: gprSessionData.calculatorData,
      });

      // Retrieve session
      const res = await request('GET', `/api/gpr/session/${encodeURIComponent(email)}`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.email).toBe(email.toLowerCase());
      expect(data.session.totalRefund).toBe(gprSessionData.calculatorData.calculationResult.totalRefund);
    });

    it('returns 404 for non-existent session', async () => {
      const res = await request('GET', `/api/gpr/session/nonexistent@example.com`);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found or expired');
    });
  });

  // ============================================================
  // Application Management Tests (Protected)
  // ============================================================

  describe('GET /api/gpr/applications', () => {
    it('returns applications for authenticated user', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request('GET', '/api/gpr/applications', undefined, {
        Authorization: `Bearer ${token}`,
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.applications)).toBe(true);
    });

    it('returns 401 without token', async () => {
      const res = await request('GET', '/api/gpr/applications');

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request('GET', '/api/gpr/applications', undefined, {
        Authorization: 'Bearer invalid-token',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/gpr/applications/:id', () => {
    it('returns specific application for owner', async () => {
      const { userId, token, email } = await createTestUserWithToken();

      // Create a pending session and migrate to application
      createdSessionEmails.push(email);
      await testDb.insert(pendingSessions).values({
        email,
        numberOfJobs: 1,
        jobs: gprSessionData.calculatorData.jobs,
        calculationResult: gprSessionData.calculatorData.calculationResult,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Migrate session
      const migrateRes = await request('POST', '/api/gpr/migrate-session', undefined, {
        Authorization: `Bearer ${token}`,
      });
      const migrateData = await migrateRes.json();

      if (migrateData.application) {
        // Get the application
        const res = await request(
          'GET',
          `/api/gpr/applications/${migrateData.application.id}`,
          undefined,
          { Authorization: `Bearer ${token}` }
        );

        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.application.id).toBe(migrateData.application.id);
      }
    });

    it('returns 404 for non-existent application', async () => {
      const { token } = await createTestUserWithToken();
      const fakeId = crypto.randomUUID();

      const res = await request('GET', `/api/gpr/applications/${fakeId}`, undefined, {
        Authorization: `Bearer ${token}`,
      });

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Application not found');
    });

    it('returns 404 when user does not own application', async () => {
      const { userId: userId1, token: token1, email: email1 } = await createTestUserWithToken();
      const { token: token2 } = await createTestUserWithToken();

      // Create application for user 1
      createdSessionEmails.push(email1);
      await testDb.insert(pendingSessions).values({
        email: email1,
        numberOfJobs: 1,
        jobs: gprSessionData.calculatorData.jobs,
        calculationResult: gprSessionData.calculatorData.calculationResult,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const migrateRes = await request('POST', '/api/gpr/migrate-session', undefined, {
        Authorization: `Bearer ${token1}`,
      });
      const migrateData = await migrateRes.json();

      if (migrateData.application) {
        // Try to access as user 2
        const res = await request(
          'GET',
          `/api/gpr/applications/${migrateData.application.id}`,
          undefined,
          { Authorization: `Bearer ${token2}` }
        );

        expect(res.status).toBe(404);
      }
    });
  });

  describe('PUT /api/gpr/applications/:id', () => {
    it('updates application for owner', async () => {
      const { token, email } = await createTestUserWithToken();

      // Create application
      createdSessionEmails.push(email);
      await testDb.insert(pendingSessions).values({
        email,
        numberOfJobs: 1,
        jobs: gprSessionData.calculatorData.jobs,
        calculationResult: gprSessionData.calculatorData.calculationResult,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const migrateRes = await request('POST', '/api/gpr/migrate-session', undefined, {
        Authorization: `Bearer ${token}`,
      });
      const migrateData = await migrateRes.json();

      if (migrateData.application) {
        // Update application
        const res = await request(
          'PUT',
          `/api/gpr/applications/${migrateData.application.id}`,
          {
            citizenship: 'AU',
            residence: 'AU',
          },
          { Authorization: `Bearer ${token}` }
        );

        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.application.citizenship).toBe('AU');
        expect(data.application.residence).toBe('AU');
      }
    });

    it('returns 404 for non-existent application', async () => {
      const { token } = await createTestUserWithToken();
      const fakeId = crypto.randomUUID();

      const res = await request(
        'PUT',
        `/api/gpr/applications/${fakeId}`,
        { citizenship: 'AU' },
        { Authorization: `Bearer ${token}` }
      );

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/gpr/migrate-session', () => {
    it('migrates pending session to application', async () => {
      const { token, email } = await createTestUserWithToken();

      // Create pending session
      createdSessionEmails.push(email);
      await testDb.insert(pendingSessions).values({
        email,
        numberOfJobs: 1,
        jobs: gprSessionData.calculatorData.jobs,
        calculationResult: gprSessionData.calculatorData.calculationResult,
        citizenship: 'AU',
        residence: 'AU',
        eligibilityResult: { isEligible: true, reasons: ['Test'] },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Migrate
      const res = await request('POST', '/api/gpr/migrate-session', undefined, {
        Authorization: `Bearer ${token}`,
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session migrated to application');
      expect(data.application).toBeDefined();
      // Compare as numbers to handle decimal formatting differences (e.g., "3240.50" vs "3240.5")
      expect(parseFloat(data.application.totalRefund)).toBe(
        gprSessionData.calculatorData.calculationResult.totalRefund
      );
    });

    it('returns success with null application when no session exists', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request('POST', '/api/gpr/migrate-session', undefined, {
        Authorization: `Bearer ${token}`,
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('No pending session found to migrate');
      expect(data.application).toBeNull();
    });

    it('returns 401 without token', async () => {
      const res = await request('POST', '/api/gpr/migrate-session');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // Rules Endpoint Tests
  // ============================================================

  describe('GET /api/gpr/rules', () => {
    it('returns GPR rules', async () => {
      const res = await request('GET', '/api/gpr/rules');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rules).toBeDefined();
      expect(data.rules.general).toBeDefined();
      expect(data.rules.eligibility).toBeDefined();
    });
  });
});
