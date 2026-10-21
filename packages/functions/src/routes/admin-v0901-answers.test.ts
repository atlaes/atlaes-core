import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../drizzle/schema/shared';
import { claimsTable } from '../drizzle/schema/claims';
import admin from './admin';
import { AuthService } from '../utils/auth';

// Per-case V0901 answers on the admin claim page (migration 0025).
//   pnpm vitest run src/routes/admin-v0901-answers.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;
const stamp = Date.now();
const userIds: string[] = [];
const claimIds: string[] = [];

async function makeUser(role: string, tag: string) {
  const [user] = await testDb
    .insert(users)
    .values({
      email: `test-v0901-${tag}-${stamp}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role,
    })
    .returning();
  userIds.push(user.id);
  const token = AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: true,
    role,
  }).accessToken;
  return { user, token };
}

async function makeClaim(
  ownerId: string,
  overrides: Partial<typeof claimsTable.$inferInsert> = {}
) {
  const [claim] = await testDb
    .insert(claimsTable)
    .values({
      userId: ownerId,
      status: 'submitted',
      workflowState: 'submitted',
      firstName: 'Priya',
      lastName: 'Sharma',
      caseType: 'drv_refund',
      submittedAt: new Date(),
      ...overrides,
    })
    .returning();
  claimIds.push(claim.id);
  return claim;
}

// Response bodies are untyped JSON in these tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const call = (method: string, path: string, token: string, body?: unknown) =>
  app.request(`/api/admin${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const answersPath = (id: string) => `/claims/${id}/v0901-answers`;

describe('admin V0901 answers', () => {
  let adminToken: string;
  let userToken: string;
  let ownerId: string;

  beforeAll(async () => {
    testClient = postgres(TEST_DATABASE_URL);
    testDb = drizzle(testClient);
    app = new Hono();
    app.route('/api/admin', admin);
    const a = await makeUser('admin', 'admin');
    const u = await makeUser('user', 'user');
    adminToken = a.token;
    userToken = u.token;
    ownerId = u.user.id;
  });

  afterAll(async () => {
    try {
      for (const id of claimIds) {
        await testClient`DELETE FROM claims.claim_workflow_states WHERE claim_id = ${id}::uuid`;
        await testClient`DELETE FROM shared.audit_logs WHERE resource_id = ${id}::uuid`;
        await testClient`DELETE FROM claims.claims WHERE id = ${id}::uuid`;
      }
      for (const id of userIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE user_id = ${id}::uuid`;
        await testClient`DELETE FROM shared.users WHERE id = ${id}::uuid`;
      }
    } finally {
      await testClient.end();
    }
  });

  it('is admin-only', async () => {
    const claim = await makeClaim(ownerId);
    expect((await call('GET', answersPath(claim.id), userToken)).status).toBe(
      403
    );
  });

  it('shows the defaults for a new DRV case', async () => {
    const claim = await makeClaim(ownerId);
    const res = await call('GET', answersPath(claim.id), adminToken);
    expect(res.status).toBe(200);
    const body: Json = await res.json();
    expect(body).toMatchObject({ applicable: true, frozen: false });
    expect(
      body.questions.map((q: Json) => [q.number, q.effective, q.override])
    ).toEqual([
      ['5.1', true, null],
      ['5.1', true, null],
      ['6.1', false, null],
      ['6.3', false, null],
      ['8.1', false, null],
    ]);
  });

  it('saves overrides, resets with null, and logs both', async () => {
    const claim = await makeClaim(ownerId);
    const res = await call('PUT', answersPath(claim.id), adminToken, {
      foreignContributions: true,
      germanBenefitsReceived: true,
    });
    expect(res.status).toBe(200);
    const [row] =
      await testClient`SELECT v0901_answers FROM claims.claims WHERE id = ${claim.id}::uuid`;
    expect(row.v0901_answers).toEqual({
      foreignContributions: true,
      germanBenefitsReceived: true,
    });

    const reset = await call('PUT', answersPath(claim.id), adminToken, {
      foreignContributions: null,
    });
    const body: Json = await reset.json();
    expect(
      body.questions.find((q: Json) => q.key === 'foreignContributions')
    ).toMatchObject({ override: null, effective: false });
    const [row2] =
      await testClient`SELECT v0901_answers FROM claims.claims WHERE id = ${claim.id}::uuid`;
    expect(row2.v0901_answers).toEqual({ germanBenefitsReceived: true });

    const audit =
      await testClient`SELECT action FROM shared.audit_logs WHERE resource_id = ${claim.id}::uuid AND action = 'claim_v0901_answers_updated'`;
    expect(audit.length).toBe(2);
    const wf =
      await testClient`SELECT metadata FROM claims.claim_workflow_states WHERE claim_id = ${claim.id}::uuid`;
    expect(wf.map((w) => (w.metadata as { action: string }).action)).toContain(
      'v0901_answers_update'
    );
  });

  it('rejects unknown questions and non-boolean values', async () => {
    const claim = await makeClaim(ownerId);
    for (const body of [
      { divorceProceedings: true },
      { foreignContributions: 'ja' },
    ]) {
      expect(
        (await call('PUT', answersPath(claim.id), adminToken, body)).status
      ).toBe(400);
    }
  });

  it('is read-only once the pack is frozen', async () => {
    const claim = await makeClaim(ownerId, {
      submissionPackS3Key: 'claims/x/submission-pack.pdf',
      submissionPackGeneratedAt: new Date(),
    });
    const get: Json = await (
      await call('GET', answersPath(claim.id), adminToken)
    ).json();
    expect(get.frozen).toBe(true);
    const res = await call('PUT', answersPath(claim.id), adminToken, {
      foreignContributions: true,
    });
    expect(res.status).toBe(409);
  });

  it('refuses cases without a V0901 (bAV)', async () => {
    const claim = await makeClaim(ownerId, { caseType: 'bav_cashout' });
    const get: Json = await (
      await call('GET', answersPath(claim.id), adminToken)
    ).json();
    expect(get.applicable).toBe(false);
    const res = await call('PUT', answersPath(claim.id), adminToken, {
      foreignContributions: true,
    });
    expect(res.status).toBe(409);
  });

  it('404 for an unknown claim', async () => {
    const res = await call(
      'GET',
      answersPath('00000000-0000-4000-8000-000000000000'),
      adminToken
    );
    expect(res.status).toBe(404);
  });
});
