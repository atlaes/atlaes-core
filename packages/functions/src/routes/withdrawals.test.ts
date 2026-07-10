import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';
import { users, profiles } from '../drizzle/schema/shared';
import { claimsTable } from '../drizzle/schema/claims';
import withdrawals from './withdrawals';
import { AuthService } from '../utils/auth';
import { WITHDRAWAL_NOT_FOUND_MESSAGE } from '../services/contract-withdrawal';

// Focused tests for the contract-withdrawal endpoints
// (POST /api/withdrawals/identify and /confirm). Self-contained harness
// mirroring claims-stop.test.ts so it runs in isolation:
//   pnpm vitest run src/routes/withdrawals.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;

const createdUserIds: string[] = [];

describe('Contract withdrawal endpoints', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET =
      'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });

    app = new Hono();
    app.route('/api/withdrawals', withdrawals);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  afterEach(async () => {
    await cleanupTestData();
    createdUserIds.length = 0;
  });

  async function cleanupTestData() {
    try {
      for (const userId of createdUserIds) {
        await testClient`
          DELETE FROM claims.contract_withdrawals
          WHERE user_id = ${userId}::uuid
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

  async function createUserWithClaim(opts: {
    email: string;
    firstName: string;
    lastName: string;
    submitted?: boolean;
  }): Promise<{ userId: string; claimId: string; token: string }> {
    const [user] = await testDb
      .insert(users)
      .values({
        email: opts.email,
        emailVerified: true,
        authProvider: 'magic_link',
      })
      .returning();
    createdUserIds.push(user.id);

    await testDb.insert(profiles).values({
      userId: user.id,
      firstName: opts.firstName,
      lastName: opts.lastName,
    });

    const [claim] = await testDb
      .insert(claimsTable)
      .values({
        userId: user.id,
        status: opts.submitted ? 'submitted' : 'draft',
        workflowState: opts.submitted ? 'submitted' : 'personal_info',
        firstName: opts.firstName,
        lastName: opts.lastName,
        paidAt: new Date(),
        submittedAt: opts.submitted ? new Date() : null,
      })
      .returning();

    const token = AuthService.generateTokens({
      userId: user.id,
      email: user.email,
      emailVerified: true,
    }).accessToken;

    return { userId: user.id, claimId: claim.id, token };
  }

  it('identify returns the generic message on a wrong email (404)', async () => {
    const { claimId } = await createUserWithClaim({
      email: `test-withdraw-${Date.now()}-a@example.com`,
      firstName: 'Anna',
      lastName: 'Schmidt',
    });

    const res = await request('POST', '/api/withdrawals/identify', {
      fullName: 'Anna Schmidt',
      email: 'someone-else@example.com',
      claimId,
      pensionTypeOrInstitution: 'VBL',
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe(WITHDRAWAL_NOT_FOUND_MESSAGE);
  });

  it('identify matches on consistent name + email + claimId', async () => {
    const email = `test-withdraw-${Date.now()}-b@example.com`;
    const { claimId } = await createUserWithClaim({
      email,
      firstName: 'Anna',
      lastName: 'Schmidt',
    });

    const res = await request('POST', '/api/withdrawals/identify', {
      // Case/whitespace/middle-name tolerance.
      fullName: '  anna  maria schmidt ',
      email: email.toUpperCase(),
      claimId,
      pensionTypeOrInstitution: 'VBL',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.contract.claimId).toBe(claimId);
    expect(data.contract.applicationAlreadySubmitted).toBe(false);
    expect(data.contract.declarationText).toContain('withdraw');
  });

  it('confirm (public) creates a duplicate-guarded, audited withdrawal', async () => {
    const email = `test-withdraw-${Date.now()}-c@example.com`;
    const { userId, claimId } = await createUserWithClaim({
      email,
      firstName: 'Karl',
      lastName: 'Meyer',
    });

    const payload = {
      claimId,
      fullName: 'Karl Meyer',
      email,
      pensionTypeOrInstitution: 'VBL',
    };

    const res = await request('POST', '/api/withdrawals/confirm', payload);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.contract.alreadyWithdrawn).toBe(true);

    // Record persisted with policy version + stored declaration text.
    const rows = await testClient`
      SELECT policy_version, declaration_text, application_already_submitted, revocation_required
      FROM claims.contract_withdrawals WHERE claim_id = ${claimId}::uuid
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].policy_version).toBe('withdrawal-policy-2026-06-v1');
    expect(String(rows[0].declaration_text).length).toBeGreaterThan(0);
    expect(rows[0].application_already_submitted).toBe(false);
    expect(rows[0].revocation_required).toBe(false);

    // Audit entry flagged urgent for operational review.
    const audit = await testClient`
      SELECT details FROM shared.audit_logs
      WHERE user_id = ${userId}::uuid AND action = 'contract_withdrawal_confirmed'
    `;
    expect(audit.length).toBe(1);
    expect((audit[0].details as { urgent?: boolean }).urgent).toBe(true);

    // Not-yet-submitted claim is flagged to stop automated processing.
    const claim = await testClient`
      SELECT status FROM claims.claims WHERE id = ${claimId}::uuid
    `;
    expect(claim[0].status).toBe('rejected');

    // Second withdrawal for the same claim is rejected cleanly (409).
    const dup = await request('POST', '/api/withdrawals/confirm', payload);
    expect(dup.status).toBe(409);
  });

  it('confirm (already-submitted) creates a revocation task and keeps status', async () => {
    const email = `test-withdraw-${Date.now()}-d@example.com`;
    const { claimId } = await createUserWithClaim({
      email,
      firstName: 'Lena',
      lastName: 'Braun',
      submitted: true,
    });

    const res = await request('POST', '/api/withdrawals/confirm', {
      claimId,
      fullName: 'Lena Braun',
      email,
      pensionTypeOrInstitution: 'ZVK Darmstadt',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.contract.applicationAlreadySubmitted).toBe(true);

    const rows = await testClient`
      SELECT revocation_required, revocation_task_created_at
      FROM claims.contract_withdrawals WHERE claim_id = ${claimId}::uuid
    `;
    expect(rows[0].revocation_required).toBe(true);
    expect(rows[0].revocation_task_created_at).not.toBeNull();

    // The submitted pension application is NOT cancelled/reversed.
    const claim = await testClient`
      SELECT status FROM claims.claims WHERE id = ${claimId}::uuid
    `;
    expect(claim[0].status).toBe('submitted');
  });

  it('confirm (authenticated owner) skips the name/email re-check', async () => {
    const email = `test-withdraw-${Date.now()}-e@example.com`;
    const { claimId, token } = await createUserWithClaim({
      email,
      firstName: 'Otto',
      lastName: 'Kern',
    });

    const res = await request(
      'POST',
      '/api/withdrawals/confirm',
      { claimId, pensionTypeOrInstitution: 'VBL' },
      { Authorization: `Bearer ${token}` }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('identify on a non-existent claim returns the generic message (404)', async () => {
    const res = await request('POST', '/api/withdrawals/identify', {
      fullName: 'Nobody Here',
      email: 'nobody@example.com',
      claimId: '00000000-0000-0000-0000-000000000000',
      pensionTypeOrInstitution: 'VBL',
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe(WITHDRAWAL_NOT_FOUND_MESSAGE);
  });
});
