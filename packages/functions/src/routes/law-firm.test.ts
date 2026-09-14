import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';
import {
  users,
  profiles,
  lawFirms,
  lawFirmMembers,
} from '../drizzle/schema/shared';
import { claimsTable } from '../drizzle/schema/claims';
import lawFirm from './law-firm';
import admin from './admin';
import { AuthService } from '../utils/auth';

// Firm-scoped portal routes against a real database. Mirrors
// claims-stop.test.ts so it runs in isolation:
//   pnpm vitest run src/routes/law-firm.test.ts
// Requires migration 0010 (law firm tables) on the local database.
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;

const stamp = Date.now();
const created = {
  userIds: [] as string[],
  firmIds: [] as string[],
  claimIds: [] as string[],
};

async function makeUser(role: string, tag: string) {
  const [user] = await testDb
    .insert(users)
    .values({
      email: `test-lawfirm-${tag}-${stamp}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role,
    })
    .returning();
  await testDb
    .insert(profiles)
    .values({ userId: user.id, firstName: 'Test', lastName: tag });
  created.userIds.push(user.id);
  const token = AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: true,
    role,
  }).accessToken;
  return { user, token };
}

async function makeFirm(name: string) {
  const [firm] = await testDb
    .insert(lawFirms)
    .values({ name, active: true })
    .returning();
  created.firmIds.push(firm.id);
  return firm;
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
      firstName: 'Emily',
      lastName: 'Carter',
      pensionType: 'private',
      iban: 'DE89370400440532013000',
      submittedAt: new Date(),
      ...overrides,
    })
    .returning();
  created.claimIds.push(claim.id);
  return claim;
}

function request(
  method: string,
  path: string,
  token: string,
  body?: object | FormData
) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return app.request(`http://localhost${path}`, {
    method,
    headers,
    body: payload,
  });
}

describe('Law firm portal routes', () => {
  let firmA: typeof lawFirms.$inferSelect;
  let firmB: typeof lawFirms.$inferSelect;
  let memberA: Awaited<ReturnType<typeof makeUser>>;
  let memberB: Awaited<ReturnType<typeof makeUser>>;
  let orphan: Awaited<ReturnType<typeof makeUser>>;
  let adminUser: Awaited<ReturnType<typeof makeUser>>;
  let claimant: Awaited<ReturnType<typeof makeUser>>;
  let claimA: typeof claimsTable.$inferSelect;
  let claimB: typeof claimsTable.$inferSelect;
  let claimDirect: typeof claimsTable.$inferSelect;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET =
      'test-jwt-secret-key-for-testing-purposes-only-32-chars';
    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });

    app = new Hono();
    app.route('/api/law-firm', lawFirm);
    app.route('/api/admin', admin);

    firmA = await makeFirm(`Firm A ${stamp}`);
    firmB = await makeFirm(`Firm B ${stamp}`);
    memberA = await makeUser('law_firm', 'a');
    memberB = await makeUser('law_firm', 'b');
    orphan = await makeUser('law_firm', 'orphan');
    adminUser = await makeUser('admin', 'admin');
    claimant = await makeUser('user', 'claimant');
    await testDb.insert(lawFirmMembers).values([
      { lawFirmId: firmA.id, userId: memberA.user.id, role: 'member' },
      { lawFirmId: firmB.id, userId: memberB.user.id, role: 'member' },
    ]);

    claimA = await makeClaim(claimant.user.id, {
      handlingRoute: 'law_firm',
      lawFirmId: firmA.id,
      lawFirmCaseState: 'new',
      lawFirmAssignedAt: new Date(),
    });
    claimB = await makeClaim(claimant.user.id, {
      handlingRoute: 'law_firm',
      lawFirmId: firmB.id,
      lawFirmCaseState: 'new',
      lawFirmAssignedAt: new Date(),
      firstName: 'Bruno',
      lastName: 'Bauer',
    });
    claimDirect = await makeClaim(claimant.user.id, {
      handlingRoute: 'direct',
      firstName: 'Dora',
      lastName: 'Direkt',
    });
  });

  afterAll(async () => {
    try {
      for (const claimId of created.claimIds) {
        await testClient`DELETE FROM claims.claim_workflow_states WHERE claim_id = ${claimId}::uuid`;
        await testClient`DELETE FROM claims.claim_correspondence WHERE claim_id = ${claimId}::uuid`;
        await testClient`DELETE FROM claims.claims WHERE id = ${claimId}::uuid`;
      }
      // Memberships reference both the member and the inviting admin, so
      // clear them all before any user row goes.
      for (const userId of created.userIds) {
        await testClient`DELETE FROM shared.law_firm_members WHERE user_id = ${userId}::uuid OR invited_by = ${userId}::uuid`;
      }
      for (const userId of created.userIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE user_id = ${userId}::uuid`;
        await testClient`DELETE FROM shared.documents WHERE user_id = ${userId}::uuid`;
        await testClient`DELETE FROM shared.profiles WHERE user_id = ${userId}::uuid`;
        await testClient`DELETE FROM shared.users WHERE id = ${userId}::uuid`;
      }
      for (const firmId of created.firmIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE resource_id = ${firmId}::uuid`;
        await testClient`DELETE FROM shared.law_firms WHERE id = ${firmId}::uuid`;
      }
    } finally {
      await testClient.end();
    }
  });

  describe('access', () => {
    it('rejects a plain user and an admin on the portal', async () => {
      expect(
        (await request('GET', '/api/law-firm/me', claimant.token)).status
      ).toBe(403);
      expect(
        (await request('GET', '/api/law-firm/me', adminUser.token)).status
      ).toBe(403);
    });

    it('rejects a law_firm user without membership', async () => {
      const res = await request('GET', '/api/law-firm/me', orphan.token);
      expect(res.status).toBe(403);
      expect((await res.json()).error).toMatch(/membership/);
    });

    it('returns firm and membership for a member', async () => {
      const res = await request('GET', '/api/law-firm/me', memberA.token);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.firm.id).toBe(firmA.id);
      expect(body.membership.userId).toBe(memberA.user.id);
    });
  });

  describe('queue scoping', () => {
    it('lists only the firm’s own law-firm claims', async () => {
      const res = await request('GET', '/api/law-firm/claims', memberA.token);
      expect(res.status).toBe(200);
      const body = await res.json();
      const ids = body.claims.map((c: { id: string }) => c.id);
      expect(ids).toContain(claimA.id);
      expect(ids).not.toContain(claimB.id);
      expect(ids).not.toContain(claimDirect.id);
    });

    it('searches by name', async () => {
      const res = await request(
        'GET',
        '/api/law-firm/claims?search=carter',
        memberA.token
      );
      const body = await res.json();
      expect(body.total).toBe(1);
      expect(body.claims[0].claimantName).toBe('Emily Carter');
    });

    it('hides another firm’s case and direct claims on detail', async () => {
      expect(
        (
          await request(
            'GET',
            `/api/law-firm/claims/${claimB.id}`,
            memberA.token
          )
        ).status
      ).toBe(404);
      expect(
        (
          await request(
            'GET',
            `/api/law-firm/claims/${claimDirect.id}`,
            memberA.token
          )
        ).status
      ).toBe(404);
    });

    it('masks the IBAN on the case screen', async () => {
      const res = await request(
        'GET',
        `/api/law-firm/claims/${claimA.id}`,
        memberA.token
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.claim.claimant.ibanMasked).toBe('DE89 **** **** 3000');
      expect(JSON.stringify(body)).not.toContain('DE89370400440532013000');
    });
  });

  describe('case events', () => {
    it('refuses a response before submission', async () => {
      const res = await request(
        'POST',
        `/api/law-firm/claims/${claimA.id}/events`,
        memberA.token,
        { event: 'response_received' }
      );
      expect(res.status).toBe(400);
    });

    it('needs a channel for submission, then records it', async () => {
      const missing = await request(
        'POST',
        `/api/law-firm/claims/${claimA.id}/events`,
        memberA.token,
        { event: 'submitted', date: '2026-09-10' }
      );
      expect(missing.status).toBe(400);

      const ok = await request(
        'POST',
        `/api/law-firm/claims/${claimA.id}/events`,
        memberA.token,
        { event: 'submitted', date: '2026-09-10', channel: 'post' }
      );
      expect(ok.status).toBe(200);
      expect((await ok.json()).caseState).toBe('submitted');

      const detail = await (
        await request('GET', `/api/law-firm/claims/${claimA.id}`, memberA.token)
      ).json();
      expect(detail.claim.caseState).toBe('submitted');
      expect(detail.claim.submissionChannel).toBe('post');
      expect(detail.events.map((e: { event: string }) => e.event)).toContain(
        'submitted'
      );
    });

    it('cannot record events on another firm’s case', async () => {
      const res = await request(
        'POST',
        `/api/law-firm/claims/${claimB.id}/events`,
        memberA.token,
        { event: 'closed' }
      );
      expect(res.status).toBe(404);
    });
  });

  describe('file number', () => {
    it('sets the reference and keeps it on the claim', async () => {
      const res = await request(
        'PUT',
        `/api/law-firm/claims/${claimA.id}/reference`,
        memberA.token,
        { lawFirmRef: '2026/0815-KC' }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.lawFirmRef).toBe('2026/0815-KC');
      // Package regeneration needs a signature + passport; the test claim
      // has neither, so the reference is stored but nothing is rendered.
      expect(body.regenerated).toBe(false);
    });
  });

  describe('correspondence', () => {
    it('rejects oversized and wrong-type files, accepts a PDF', async () => {
      const bad = new FormData();
      bad.append('file', new File(['x'], 'note.txt', { type: 'text/plain' }));
      const badRes = await request(
        'POST',
        `/api/law-firm/claims/${claimA.id}/correspondence`,
        memberA.token,
        bad
      );
      expect(badRes.status).toBe(400);

      const good = new FormData();
      good.append(
        'file',
        new File(['%PDF-1.4 test'], 'antwort.pdf', { type: 'application/pdf' })
      );
      good.append('note', 'Provider asks for the employer consent');
      good.append('receivedDate', '2026-09-12');
      const res = await request(
        'POST',
        `/api/law-firm/claims/${claimA.id}/correspondence`,
        memberA.token,
        good
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.correspondence.direction).toBe('provider_in');
      expect(body.correspondence.document.fileName).toBe('antwort.pdf');

      // Ops can read it through the admin API.
      const adminRes = await request(
        'GET',
        `/api/admin/claims/${claimA.id}/correspondence`,
        adminUser.token
      );
      expect(adminRes.status).toBe(200);
      const adminBody = await adminRes.json();
      expect(adminBody.correspondence).toHaveLength(1);
      expect(adminBody.correspondence[0].note).toMatch(/employer consent/);
    });
  });

  describe('admin invitations', () => {
    it('creates a law_firm user with membership and refuses an admin email', async () => {
      const email = `test-lawfirm-invitee-${stamp}@example.com`;
      const res = await request(
        'POST',
        `/api/admin/law-firms/${firmA.id}/members`,
        adminUser.token,
        { email, firstName: 'Katja', lastName: 'Chudoba' }
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.member.lawFirmId).toBe(firmA.id);
      created.userIds.push(body.member.userId);

      const invitee = await testClient`
        SELECT role FROM shared.users WHERE email = ${email}
      `;
      expect(invitee[0].role).toBe('law_firm');

      const refused = await request(
        'POST',
        `/api/admin/law-firms/${firmA.id}/members`,
        adminUser.token,
        { email: adminUser.user.email, firstName: 'A', lastName: 'B' }
      );
      expect(refused.status).toBe(400);
    });

    it('is not reachable by law-firm users', async () => {
      const res = await request(
        'GET',
        `/api/admin/law-firms/${firmA.id}/members`,
        memberA.token
      );
      expect(res.status).toBe(403);
    });
  });
});
