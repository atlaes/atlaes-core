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
import lawFirmLetters, { adminLetters } from './law-firm-letters';
import { AuthService } from '../utils/auth';
import { deps } from '../services/law-firm-letters';
import {
  SPECIMEN_LETTERS,
  specimenLetterPdf,
} from '../services/law-firm-letters/specimens';
import { E2eCleanupService } from '../services/e2e-cleanup';

// Return channel against a real database (migration 0029). OCR and the S3
// read are replaced through `deps`; letters are generated specimens.
//   pnpm vitest run src/routes/law-firm-letters.test.ts
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

// Mocked OCR: the specimen text keyed by file name; "unreadable" fails.
const ocrTexts = new Map<string, string>();
const realDeps = { ...deps };

async function makeUser(role: string, email: string, mfa = true) {
  const [user] = await testDb
    .insert(users)
    .values({ email, emailVerified: true, authProvider: 'magic_link', role })
    .returning();
  await testDb
    .insert(profiles)
    .values({ userId: user.id, firstName: 'Test', lastName: role });
  created.userIds.push(user.id);
  const token = AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: true,
    role,
    ...(mfa ? { mfa: Math.floor(Date.now() / 1000) } : {}),
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
  overrides: Partial<typeof claimsTable.$inferInsert>
) {
  const [claim] = await testDb
    .insert(claimsTable)
    .values({
      userId: ownerId,
      status: 'submitted',
      workflowState: 'submitted',
      caseType: 'drv_refund',
      handlingRoute: 'law_firm',
      lawFirmCaseState: 'new',
      lawFirmAssignedAt: new Date(),
      lawFirmReleasedAt: new Date(),
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
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'x-forwarded-for': '203.0.113.24',
  };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return app.request(`http://localhost${path}`, {
    method,
    headers,
    body: payload,
  });
}

async function letterForm(
  key: keyof typeof SPECIMEN_LETTERS | null,
  fileName?: string
) {
  const text = key ? SPECIMEN_LETTERS[key].text : `unreadable ${stamp}`;
  const name = fileName ?? (key ? SPECIMEN_LETTERS[key].fileName : 'x.pdf');
  if (key) ocrTexts.set(name, text);
  const bytes = await specimenLetterPdf(`${text}\n${name} ${stamp}`);
  const form = new FormData();
  form.append(
    'file',
    new File([bytes], name, { type: 'application/pdf' }) as unknown as Blob
  );
  return form;
}

const upload = async (
  token: string,
  key: keyof typeof SPECIMEN_LETTERS | null,
  fileName?: string
) => request('POST', '/api/law-firm/letters', token, await letterForm(key, fileName));

describe('Return channel', () => {
  let firmA: typeof lawFirms.$inferSelect;
  let firmB: typeof lawFirms.$inferSelect;
  let memberA: Awaited<ReturnType<typeof makeUser>>;
  let memberB: Awaited<ReturnType<typeof makeUser>>;
  let adminUser: Awaited<ReturnType<typeof makeUser>>;
  let claimant: Awaited<ReturnType<typeof makeUser>>;
  let sharma: typeof claimsTable.$inferSelect;
  let okafor: typeof claimsTable.$inferSelect;
  let sharmaFirmB: typeof claimsTable.$inferSelect;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.MISTRAL_API_KEY;
    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });
    app = new Hono();
    app.route('/api/law-firm/letters', lawFirmLetters);
    app.route('/api/admin/letters', adminLetters);

    deps.ocr = async ({ name }) => {
      const text = ocrTexts.get(name);
      if (!text) throw new Error('OCR returned no readable text');
      return text;
    };

    firmA = await makeFirm(`Letters Firm A ${stamp}`);
    firmB = await makeFirm(`Letters Firm B ${stamp}`);
    memberA = await makeUser(
      'law_firm',
      `test-letters-a-${stamp}@example.com`
    );
    memberB = await makeUser(
      'law_firm',
      `test-letters-b-${stamp}@example.com`
    );
    adminUser = await makeUser('admin', `test-letters-admin-${stamp}@example.com`);
    claimant = await makeUser('user', `test-letters-client-${stamp}@example.com`);
    await testDb.insert(lawFirmMembers).values([
      { lawFirmId: firmA.id, userId: memberA.user.id, role: 'member' },
      { lawFirmId: firmB.id, userId: memberB.user.id, role: 'member' },
    ]);

    sharma = await makeClaim(claimant.user.id, {
      lawFirmId: firmA.id,
      firstName: 'Anita',
      lastName: 'Sharma',
      vsnr: '10 140388 S 501',
      lawFirmRef: '06152-26',
    });
    okafor = await makeClaim(claimant.user.id, {
      lawFirmId: firmA.id,
      firstName: 'Joseph',
      lastName: 'Okafor',
      vsnr: '45020790O213',
    });
    // Same person data at another firm: never a candidate for firm A.
    sharmaFirmB = await makeClaim(claimant.user.id, {
      lawFirmId: firmB.id,
      firstName: 'Anita',
      lastName: 'Sharma',
      vsnr: '10 140388 S 501',
    });
  });

  afterAll(async () => {
    Object.assign(deps, realDeps);
    try {
      for (const firmId of created.firmIds) {
        await testClient`DELETE FROM claims.law_firm_letters WHERE law_firm_id = ${firmId}::uuid`;
      }
      for (const claimId of created.claimIds) {
        await testClient`DELETE FROM claims.client_update_tasks WHERE claim_id = ${claimId}::uuid`;
        await testClient`DELETE FROM claims.payout_decisions WHERE claim_id = ${claimId}::uuid`;
        await testClient`DELETE FROM claims.claim_correspondence WHERE claim_id = ${claimId}::uuid`;
        await testClient`DELETE FROM claims.claim_documents WHERE claim_id = ${claimId}::uuid`;
        await testClient`DELETE FROM claims.claims WHERE id = ${claimId}::uuid`;
      }
      for (const userId of created.userIds) {
        await testClient`DELETE FROM shared.law_firm_members WHERE user_id = ${userId}::uuid`;
      }
      for (const userId of created.userIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE user_id = ${userId}::uuid`;
        await testClient`DELETE FROM shared.documents WHERE user_id = ${userId}::uuid`;
        await testClient`DELETE FROM shared.profiles WHERE user_id = ${userId}::uuid`;
        await testClient`DELETE FROM shared.users WHERE id = ${userId}::uuid`;
      }
      for (const firmId of created.firmIds) {
        await testClient`DELETE FROM shared.law_firms WHERE id = ${firmId}::uuid`;
      }
    } finally {
      await testClient.end();
    }
  });

  let matchedId: string;
  let nameOnlyId: string;
  let unreadableId: string;

  describe('portal upload', () => {
    it('needs a firm membership and a fresh second factor', async () => {
      expect((await upload(adminUser.token, 'other')).status).toBe(403);
      const stale = await makeUser(
        'law_firm',
        `test-letters-stale-${stamp}@example.com`,
        false
      );
      await testDb
        .insert(lawFirmMembers)
        .values({ lawFirmId: firmA.id, userId: stale.user.id, role: 'member' });
      const res = await request('GET', '/api/law-firm/letters', stale.token);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects other file types', async () => {
      const form = new FormData();
      form.append(
        'file',
        new File(['x'], 'letter.txt', { type: 'text/plain' }) as unknown as Blob
      );
      const res = await request(
        'POST',
        '/api/law-firm/letters',
        memberA.token,
        form
      );
      expect(res.status).toBe(400);
    });

    it('VSNR + name of one case → filed to the case', async () => {
      const res = await upload(memberA.token, 'refundDecision');
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.duplicate).toBe(false);
      expect(body.letter).toMatchObject({
        status: 'matched',
        letterType: 'refund_decision',
        case: { claimId: sharma.id, name: 'Anita Sharma' },
      });
      matchedId = body.letter.id;

      const [letter] =
        await testClient`SELECT * FROM claims.law_firm_letters WHERE id = ${matchedId}::uuid`;
      expect(letter.match_method).toBe('az'); // AZ 06152-26 is on the letter
      expect(letter.next_step_status).toBe('pending');
      expect(letter.extracted.vsnr).toEqual(['10140388S501']);

      const corr =
        await testClient`SELECT * FROM claims.claim_correspondence WHERE claim_id = ${sharma.id}::uuid`;
      expect(corr).toHaveLength(1);
      expect(corr[0]).toMatchObject({
        source: 'return_channel',
        direction: 'provider_in',
        document_id: letter.document_id,
      });
      const events =
        await testClient`SELECT metadata FROM claims.claim_workflow_states WHERE claim_id = ${sharma.id}::uuid`;
      expect(events.map((e) => e.metadata.event)).toContain(
        'drv_letter_received'
      );
      const audit =
        await testClient`SELECT ip_address FROM shared.audit_logs WHERE action = 'law_firm_letter_uploaded' AND resource_id = ${matchedId}::uuid`;
      expect(audit).toHaveLength(1);
      expect(String(audit[0].ip_address)).toContain('203.0.113.24');
    });

    it('the same file twice is not stored again', async () => {
      const res = await upload(memberA.token, 'refundDecision');
      const body = await res.json();
      expect(body.duplicate).toBe(true);
      expect(body.letter.id).toBe(matchedId);
    });

    it('a name alone goes to the queue, never to the case', async () => {
      const res = await upload(memberA.token, 'nameOnly');
      const body = await res.json();
      expect(body.letter).toMatchObject({
        status: 'needs_review',
        matchReason: 'name_only',
        case: null,
      });
      nameOnlyId = body.letter.id;
      const [row] =
        await testClient`SELECT candidate_claim_ids, correspondence_id FROM claims.law_firm_letters WHERE id = ${nameOnlyId}::uuid`;
      // Firm B's Sharma is not a candidate for firm A's letter.
      expect(row.candidate_claim_ids).toEqual([sharma.id]);
      expect(row.correspondence_id).toBeNull();
    });

    it('OCR failure keeps the file and asks for review', async () => {
      const res = await upload(memberA.token, null, 'unreadable-scan.pdf');
      const body = await res.json();
      expect(body.letter).toMatchObject({
        status: 'needs_review',
        matchReason: 'ocr_failed',
      });
      unreadableId = body.letter.id;
    });

    it('lists only the own firm’s uploads', async () => {
      await upload(memberB.token, 'documentRequest', 'firm-b-letter.pdf');
      const a = await (
        await request('GET', '/api/law-firm/letters', memberA.token)
      ).json();
      expect(a.letters.map((l: { id: string }) => l.id).sort()).toEqual(
        [matchedId, nameOnlyId, unreadableId].sort()
      );
      const b = await (
        await request('GET', '/api/law-firm/letters', memberB.token)
      ).json();
      expect(b.letters).toHaveLength(1);
      // Firm B's letter names Okafor, who is not firm B's client.
      expect(b.letters[0].status).toBe('needs_review');
    });
  });

  describe('admin needs attention', () => {
    it('is admin-only', async () => {
      expect(
        (await request('GET', '/api/admin/letters', memberA.token)).status
      ).toBe(403);
    });

    it('counts and lists letters waiting for a human', async () => {
      const count = await (
        await request('GET', '/api/admin/letters/count', adminUser.token)
      ).json();
      expect(count.attention).toBeGreaterThanOrEqual(4);
      const list = await (
        await request('GET', '/api/admin/letters', adminUser.token)
      ).json();
      const ids = list.letters.map((l: { id: string }) => l.id);
      expect(ids).toEqual(
        expect.arrayContaining([matchedId, nameOnlyId, unreadableId])
      );
      const nameOnly = list.letters.find(
        (l: { id: string }) => l.id === nameOnlyId
      );
      expect(nameOnly.candidates[0]).toMatchObject({ claimId: sharma.id });
      expect(nameOnly.firm.name).toBe(firmA.name);
    });

    it('finds only cases of the letter’s firm', async () => {
      const res = await (
        await request(
          'GET',
          `/api/admin/letters/${nameOnlyId}/cases?q=sharma`,
          adminUser.token
        )
      ).json();
      expect(res.cases.map((c: { claimId: string }) => c.claimId)).toEqual([
        sharma.id,
      ]);
      const assignOther = await request(
        'POST',
        `/api/admin/letters/${nameOnlyId}/assign`,
        adminUser.token,
        { claimId: sharmaFirmB.id }
      );
      expect(assignOther.status).toBe(404);
    });

    it('ATLAES confirms the name-only letter on the case', async () => {
      const res = await request(
        'POST',
        `/api/admin/letters/${nameOnlyId}/assign`,
        adminUser.token,
        { claimId: sharma.id, note: 'Checked against the file' }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.letter).toMatchObject({
        status: 'resolved',
        matchMethod: 'admin',
        nextStepStatus: 'pending',
        case: { claimId: sharma.id },
      });
      const corr =
        await testClient`SELECT id FROM claims.claim_correspondence WHERE claim_id = ${sharma.id}::uuid`;
      expect(corr).toHaveLength(2);
    });

    it('moves a wrong match to the right case', async () => {
      const res = await request(
        'POST',
        `/api/admin/letters/${nameOnlyId}/assign`,
        adminUser.token,
        { claimId: okafor.id }
      );
      expect(res.status).toBe(200);
      const left =
        await testClient`SELECT id FROM claims.claim_correspondence WHERE claim_id = ${sharma.id}::uuid`;
      expect(left).toHaveLength(1);
      const moved =
        await testClient`SELECT id FROM claims.claim_correspondence WHERE claim_id = ${okafor.id}::uuid`;
      expect(moved).toHaveLength(1);
      const note =
        await testClient`SELECT metadata FROM claims.claim_workflow_states WHERE claim_id = ${sharma.id}::uuid AND metadata->>'type' = 'admin_note'`;
      expect(note).toHaveLength(1);
    });

    it('dismisses an unreadable letter with a note', async () => {
      expect(
        (
          await request(
            'POST',
            `/api/admin/letters/${unreadableId}/dismiss`,
            adminUser.token,
            {}
          )
        ).status
      ).toBe(400);
      const res = await request(
        'POST',
        `/api/admin/letters/${unreadableId}/dismiss`,
        adminUser.token,
        { note: 'Blank page' }
      );
      expect((await res.json()).letter.status).toBe('dismissed');
    });

    it('notify client: logs the info request and drafts the E2A update', async () => {
      const res = await request(
        'POST',
        `/api/admin/letters/${nameOnlyId}/complete`,
        adminUser.token,
        {
          action: 'notify_client',
          customerAction: 'Upload a copy of your passport',
          customerActionDue: '2026-11-15',
          infoRequestSource: 'customer',
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.template).toBe('E2A');
      expect(body.letter).toMatchObject({
        nextStepStatus: 'done',
        nextStepAction: 'notify_client',
      });
      const again = await request(
        'POST',
        `/api/admin/letters/${nameOnlyId}/complete`,
        adminUser.token,
        { action: 'mark_handled', note: 'twice' }
      );
      expect(again.status).toBe(409);
    });

    it('record decision: hands the Bescheid to the payout flow', async () => {
      deps.download = async () =>
        Buffer.from(await specimenLetterPdf(SPECIMEN_LETTERS.refundDecision.text));
      const res = await request(
        'POST',
        `/api/admin/letters/${matchedId}/complete`,
        adminUser.token,
        { action: 'record_decision', receivedAt: '2026-10-05' }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.decisionId).toBeTruthy();
      const [decision] =
        await testClient`SELECT received_at, claim_id FROM claims.payout_decisions WHERE id = ${body.result.decisionId}::uuid`;
      expect(decision.claim_id).toBe(sharma.id);
      expect(String(decision.received_at)).toContain('2026-10-05');
    });

    it('leaves the queue once handled', async () => {
      const list = await (
        await request('GET', '/api/admin/letters', adminUser.token)
      ).json();
      const ids = list.letters.map((l: { id: string }) => l.id);
      expect(ids).not.toContain(matchedId);
      expect(ids).not.toContain(nameOnlyId);
      expect(ids).not.toContain(unreadableId);
      const handled = await (
        await request('GET', '/api/admin/letters?view=handled', adminUser.token)
      ).json();
      expect(handled.letters.map((l: { id: string }) => l.id)).toEqual(
        expect.arrayContaining([matchedId, nameOnlyId, unreadableId])
      );
    });
  });

  describe('e2e cleanup', () => {
    it('removes letters a test firm user uploaded, with their filing', async () => {
      const e2eEmail = `letters-${stamp}@e2e.test`;
      const e2eMember = await makeUser('law_firm', e2eEmail);
      await testDb.insert(lawFirmMembers).values({
        lawFirmId: firmA.id,
        userId: e2eMember.user.id,
        role: 'member',
      });
      const res = await upload(
        e2eMember.token,
        'documentRequest',
        'e2e-okafor.pdf'
      );
      // Okafor's VSNR + name → filed to a (non-test) case.
      const body = await res.json();
      expect(body.letter.status).toBe('matched');
      const letterId = body.letter.id;

      const result = await E2eCleanupService.cleanup({ emails: [e2eEmail] });
      expect(result.lawFirmLetters).toBe(1);
      expect(result.users).toBe(1);
      const rows =
        await testClient`SELECT id FROM claims.law_firm_letters WHERE id = ${letterId}::uuid`;
      expect(rows).toHaveLength(0);
      // Only the letter ATLAES moved there earlier stays on the case.
      const corr =
        await testClient`SELECT id FROM claims.claim_correspondence WHERE claim_id = ${okafor.id}::uuid`;
      expect(corr).toHaveLength(1);
      created.userIds = created.userIds.filter((id) => id !== e2eMember.user.id);
    });
  });
});
