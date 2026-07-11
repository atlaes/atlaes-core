import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';
import { users, profiles } from '../drizzle/schema/shared';
import claims from './claims';
import { AuthService } from '../utils/auth';

// Focused tests for the Confirm-step stop endpoint (POST /api/claims/:id/stop).
// Self-contained harness mirroring claims.test.ts so it runs in isolation:
//   pnpm vitest run src/routes/claims-stop.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;

const createdUserIds: string[] = [];
const createdClaimIds: string[] = [];

describe('Claims stop endpoint', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET =
      'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });

    app = new Hono();
    app.route('/api/claims', claims);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  afterEach(async () => {
    await cleanupTestData();
    createdUserIds.length = 0;
    createdClaimIds.length = 0;
  });

  async function cleanupTestData() {
    try {
      for (const userId of createdUserIds) {
        await testClient`
          DELETE FROM claims.claim_workflow_states
          WHERE claim_id IN (SELECT id FROM claims.claims WHERE user_id = ${userId}::uuid)
        `;
        await testClient`
          DELETE FROM claims.claims WHERE user_id = ${userId}::uuid
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

  async function createTestUserWithToken(): Promise<{
    userId: string;
    token: string;
  }> {
    const email = `test-claims-stop-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}@example.com`;

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

    return { userId: user.id, token };
  }

  async function createDraftClaim(token: string): Promise<string> {
    const res = await request(
      'POST',
      '/api/claims',
      {},
      { Authorization: `Bearer ${token}` }
    );
    const data = await res.json();
    createdClaimIds.push(data.claim.id);
    return data.claim.id;
  }

  it('marks the claim rejected and records reasons', async () => {
    const { userId, token } = await createTestUserWithToken();
    const claimId = await createDraftClaim(token);

    const res = await request(
      'POST',
      `/api/claims/${claimId}/stop`,
      { reasons: ['laterCivilServant'] },
      { Authorization: `Bearer ${token}` }
    );

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.claim.status).toBe('rejected');
    expect(data.claim.workflowState).toBe('rejected');

    // Audit log records which question(s) triggered the stop.
    const audit = await testClient`
      SELECT action, details FROM shared.audit_logs
      WHERE user_id = ${userId}::uuid AND action = 'claim_stopped_confirm'
    `;
    expect(audit.length).toBe(1);
    expect((audit[0].details as { reasons?: string[] }).reasons).toContain(
      'laterCivilServant'
    );

    // Workflow-state metadata distinguishes this from an admin rejection.
    const wf = await testClient`
      SELECT metadata FROM claims.claim_workflow_states
      WHERE claim_id = ${claimId}::uuid AND state = 'rejected'
    `;
    expect(wf.length).toBeGreaterThan(0);
    expect((wf[0].metadata as { action?: string }).action).toBe('confirm_stop');
  });

  it('rejects an empty reasons array (400)', async () => {
    const { token } = await createTestUserWithToken();
    const claimId = await createDraftClaim(token);

    const res = await request(
      'POST',
      `/api/claims/${claimId}/stop`,
      { reasons: [] },
      { Authorization: `Bearer ${token}` }
    );

    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request('POST', '/api/claims/some-id/stop', {
      reasons: ['previousRefund'],
    });
    expect(res.status).toBe(401);
  });
});
