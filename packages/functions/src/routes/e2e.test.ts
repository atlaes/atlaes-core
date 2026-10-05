import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import auth from './auth';
import e2e from './e2e';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { E2E_SECRET_HEADER } from '../utils/e2e';

/**
 * DB-backed tests for the staging e2e login: the magic-link response under
 * production NODE_ENV and the /api/e2e/cleanup endpoint. `env.NODE_ENV` is
 * flipped to 'production' (the route reads the cached env) while
 * process.env.NODE_ENV stays 'test', which makes getE2eConfig() re-read
 * APP_STAGE / E2E_LOGIN_SECRET per case.
 */

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

const SECRET = 'route-test-e2e-secret-0123456789abcdefghij';

let sql: ReturnType<typeof postgres>;
let app: Hono;
const savedEnv = {
  APP_STAGE: process.env.APP_STAGE,
  E2E_LOGIN_SECRET: process.env.E2E_LOGIN_SECRET,
};
const savedNodeEnv = env.NODE_ENV;
const controlUserIds: string[] = [];

function e2eEmail(tag: string) {
  return `route-${tag}-${randomUUID().slice(0, 8)}@e2e.test`;
}

async function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

const withSecret = { [E2E_SECRET_HEADER]: SECRET };

describe('staging e2e login', () => {
  beforeAll(() => {
    sql = postgres(TEST_DATABASE_URL, { max: 3, onnotice: () => {} });
    app = new Hono();
    app.route('/api/auth', auth);
    app.route('/api/e2e', e2e);
  });

  beforeEach(() => {
    process.env.APP_STAGE = 'staging';
    process.env.E2E_LOGIN_SECRET = SECRET;
    env.NODE_ENV = 'production';
  });

  afterEach(() => {
    env.NODE_ENV = savedNodeEnv;
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    // Sweep everything this file created on the e2e domain, then the
    // control users.
    process.env.APP_STAGE = 'staging';
    process.env.E2E_LOGIN_SECRET = SECRET;
    await post('/api/e2e/cleanup', { olderThanMinutes: 0 }, withSecret);
    for (const id of controlUserIds) {
      await sql`DELETE FROM claims.claims WHERE user_id = ${id}::uuid`;
      await sql`DELETE FROM shared.profiles WHERE user_id = ${id}::uuid`;
      await sql`DELETE FROM shared.users WHERE id = ${id}::uuid`;
    }
    await sql.end();
  });

  describe('POST /api/auth/magic-link/request under NODE_ENV=production', () => {
    function magicLinkMailLogged(info: ReturnType<typeof vi.spyOn>) {
      return info.mock.calls.some(([message]) =>
        String(message).includes('Would send magic link email')
      );
    }

    it('returns the link and sends no e-mail for a valid e2e request', async () => {
      const info = vi.spyOn(logger, 'info');
      const email = e2eEmail('login');
      const res = await post(
        '/api/auth/magic-link/request',
        { email },
        withSecret
      );
      expect(res.status).toBe(200);
      expect(res.body.magicLink).toContain('token=');
      expect(magicLinkMailLogged(info)).toBe(false);

      // The returned link really signs the user in.
      const token = new URL(res.body.magicLink).searchParams.get('token');
      const verify = await post('/api/auth/magic-link/verify', { token });
      expect(verify.status).toBe(200);
      expect(verify.body.user.email).toBe(email);
      expect(verify.body.tokens.accessToken).toBeTruthy();
    });

    it('keeps the production behaviour without the header', async () => {
      const info = vi.spyOn(logger, 'info');
      const res = await post('/api/auth/magic-link/request', {
        email: e2eEmail('nohdr'),
      });
      expect(res.status).toBe(200);
      expect(res.body.magicLink).toBeUndefined();
      // Mail path runs (and is then suppressed for the e2e domain).
      expect(
        info.mock.calls.some(([m]) =>
          String(m).includes('Not sending magic link email to e2e test address')
        )
      ).toBe(true);
    });

    it('does not return the link for a real address even with the secret', async () => {
      const info = vi.spyOn(logger, 'info');
      const res = await post(
        '/api/auth/magic-link/request',
        { email: `real-${randomUUID().slice(0, 8)}@example.com` },
        withSecret
      );
      expect(res.status).toBe(200);
      expect(res.body.magicLink).toBeUndefined();
      expect(magicLinkMailLogged(info)).toBe(true);
    });

    it('does not return the link with a wrong secret', async () => {
      const res = await post(
        '/api/auth/magic-link/request',
        { email: e2eEmail('wrong') },
        { [E2E_SECRET_HEADER]: `${SECRET}-wrong` }
      );
      expect(res.body.magicLink).toBeUndefined();
    });

    it('is hard-off on the production stage', async () => {
      process.env.APP_STAGE = 'production';
      const res = await post(
        '/api/auth/magic-link/request',
        { email: e2eEmail('prod') },
        withSecret
      );
      expect(res.status).toBe(200);
      expect(res.body.magicLink).toBeUndefined();
    });

    it('is off without a stage or without a secret', async () => {
      delete process.env.APP_STAGE;
      let res = await post(
        '/api/auth/magic-link/request',
        { email: e2eEmail('nostage') },
        withSecret
      );
      expect(res.body.magicLink).toBeUndefined();

      process.env.APP_STAGE = 'staging';
      delete process.env.E2E_LOGIN_SECRET;
      res = await post(
        '/api/auth/magic-link/request',
        { email: e2eEmail('nosecret') },
        withSecret
      );
      expect(res.body.magicLink).toBeUndefined();
    });
  });

  describe('POST /api/e2e/cleanup', () => {
    it('answers like an unknown path unless the guard passes', async () => {
      const cases: Array<() => void> = [
        () => {}, // no header (set below)
        () => {
          process.env.APP_STAGE = 'production';
        },
        () => {
          delete process.env.APP_STAGE;
        },
        () => {
          delete process.env.E2E_LOGIN_SECRET;
        },
        () => {
          process.env.E2E_LOGIN_SECRET = 'short';
        },
      ];
      for (const [i, arrange] of cases.entries()) {
        process.env.APP_STAGE = 'staging';
        process.env.E2E_LOGIN_SECRET = SECRET;
        arrange();
        const res = await post(
          '/api/e2e/cleanup',
          { olderThanMinutes: 0 },
          i === 0 ? {} : withSecret
        );
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
          error: 'Not Found',
          message: 'The requested resource was not found',
          path: '/api/e2e/cleanup',
        });
      }
      const wrong = await post(
        '/api/e2e/cleanup',
        { olderThanMinutes: 0 },
        { [E2E_SECRET_HEADER]: 'not-the-secret' }
      );
      expect(wrong.status).toBe(404);
    });

    it('rejects a request without emails or olderThanMinutes', async () => {
      const res = await post('/api/e2e/cleanup', {}, withSecret);
      expect(res.status).toBe(400);
    });

    it('deletes an e2e user with its whole graph and leaves others alone', async () => {
      const email = e2eEmail('graph');
      const userId = randomUUID();
      const controlId = randomUUID();
      const controlEmail = `control-${randomUUID().slice(0, 8)}@example.com`;
      controlUserIds.push(controlId);

      // --- e2e user graph -------------------------------------------------
      await sql`INSERT INTO shared.users (id, email, auth_provider) VALUES (${userId}::uuid, ${email}, 'magic_link')`;
      await sql`INSERT INTO shared.profiles (user_id, first_name, last_name) VALUES (${userId}::uuid, 'ERIKA', 'SPECIMEN')`;
      const [doc] = await sql`
        INSERT INTO shared.documents (user_id, file_name, file_type, file_size, s3_key, document_type)
        VALUES (${userId}::uuid, 'passport.png', 'image/png', 10, ${`users/${userId}/passport.png`}, 'passport')
        RETURNING id`;
      const [sig] = await sql`
        INSERT INTO shared.signatures (user_id, signature_data, s3_key)
        VALUES (${userId}::uuid, 'data:image/png;base64,AA==', ${`users/${userId}/signature.png`})
        RETURNING id`;
      const [gprApp] = await sql`
        INSERT INTO gpr.applications (user_id) VALUES (${userId}::uuid) RETURNING id`;
      await sql`INSERT INTO gpr.workflow_states (application_id, state) VALUES (${gprApp.id}::uuid, 'draft')`;
      await sql`
        INSERT INTO gpr.calculation_logs (application_id, input_data, calculation_result)
        VALUES (${gprApp.id}::uuid, '{}'::jsonb, '{}'::jsonb)`;
      const [claim] = await sql`
        INSERT INTO claims.claims (user_id, application_id, signature_id, status, pdf_s3_key, lettershop_submission_id)
        VALUES (${userId}::uuid, ${gprApp.id}::uuid, ${sig.id}::uuid, 'submitted', ${`claims/${userId}/claim.pdf`}, '987654')
        RETURNING id`;
      await sql`INSERT INTO claims.claim_documents (claim_id, document_id, document_role) VALUES (${claim.id}::uuid, ${doc.id}::uuid, 'passport')`;
      await sql`INSERT INTO claims.claim_workflow_states (claim_id, state) VALUES (${claim.id}::uuid, 'submitted')`;
      await sql`
        INSERT INTO claims.contract_withdrawals (claim_id, user_id, email, policy_version, declaration_text)
        VALUES (${claim.id}::uuid, ${userId}::uuid, ${email}, 'v1', 'I withdraw.')`;
      const [contact] = await sql`
        INSERT INTO claims.client_contact_log (claim_id, contact_date, logged_by, channel, type, outcome)
        VALUES (${claim.id}::uuid, '2026-10-01', ${userId}::uuid, 'phone', 'office_reply', 'test')
        RETURNING id`;
      await sql`
        INSERT INTO claims.client_update_tasks (claim_id, kind, trigger, contact_log_id, assigned_to, due_date)
        VALUES (${claim.id}::uuid, 'draft', 'contact', ${contact.id}::uuid, 'Ops', '2026-10-10')`;
      await sql`
        INSERT INTO shared.audit_logs (user_id, action, resource, resource_id, details)
        VALUES (${userId}::uuid, 'lettershop_copy_submitted', 'claim', ${claim.id}::uuid,
                ${sql.json({ submissionId: '987655', mode: 'test' })})`;
      await sql`
        INSERT INTO shared.audit_logs (user_id, action, resource, resource_id)
        VALUES (NULL, 'claim_viewed', 'claim', ${claim.id}::uuid)`;

      // Anonymous rows on the same address.
      const [session] = await sql`
        INSERT INTO gpr.pending_sessions (email, number_of_jobs, jobs, calculation_result)
        VALUES (${email}, 1, '[]'::jsonb, '{}'::jsonb) RETURNING id`;
      await sql`
        INSERT INTO gpr.calculation_logs (session_id, input_data, calculation_result)
        VALUES (${session.id}::uuid, '{}'::jsonb, '{}'::jsonb)`;
      await sql`
        INSERT INTO vbl.pending_calculator_sessions (jobs, email, expires_at)
        VALUES ('[]'::jsonb, ${email}, now() + interval '7 days')`;
      await sql`INSERT INTO gpr.leads (type, email) VALUES ('guide', ${email})`;

      // --- control user (must survive) ------------------------------------
      await sql`INSERT INTO shared.users (id, email, auth_provider) VALUES (${controlId}::uuid, ${controlEmail}, 'magic_link')`;
      await sql`INSERT INTO shared.profiles (user_id, first_name, last_name) VALUES (${controlId}::uuid, 'Control', 'User')`;
      const [controlClaim] = await sql`
        INSERT INTO claims.claims (user_id, status) VALUES (${controlId}::uuid, 'draft') RETURNING id`;

      const res = await post(
        '/api/e2e/cleanup',
        { emails: [email, controlEmail] },
        withSecret
      );
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        users: 1,
        profiles: 1,
        claims: 1,
        documents: 1,
        signatures: 1,
        contractWithdrawals: 1,
        gprApplications: 1,
        pendingSessions: 1,
        pendingCalculatorSessions: 1,
        leads: 1,
        rejectedEmails: [controlEmail],
      });
      expect(res.body.auditLogs).toBe(2);
      // pdf + document + signature keys (S3 is a no-op locally).
      expect(res.body.s3ObjectsDeleted).toBe(3);
      // No lettershop credentials in tests: both jobs go to the manual list.
      expect(
        res.body.lettershop.manualJobIds.map((j: { id: string }) => j.id).sort()
      ).toEqual(['987654', '987655']);

      const leftovers = await sql`
        SELECT
          (SELECT count(*) FROM shared.users WHERE id = ${userId}::uuid) AS users,
          (SELECT count(*) FROM claims.claims WHERE user_id = ${userId}::uuid) AS claims,
          (SELECT count(*) FROM claims.client_contact_log WHERE id = ${contact.id}::uuid) AS contacts,
          (SELECT count(*) FROM shared.audit_logs WHERE resource_id = ${claim.id}::uuid) AS audits,
          (SELECT count(*) FROM gpr.pending_sessions WHERE email = ${email}) AS sessions,
          (SELECT count(*) FROM gpr.leads WHERE email = ${email}) AS leads,
          (SELECT count(*) FROM claims.claims WHERE id = ${controlClaim.id}::uuid) AS control_claims,
          (SELECT count(*) FROM shared.users WHERE id = ${controlId}::uuid) AS control_users`;
      expect(leftovers[0]).toEqual({
        users: '0',
        claims: '0',
        contacts: '0',
        audits: '0',
        sessions: '0',
        leads: '0',
        control_claims: '1',
        control_users: '1',
      });
    });

    it('deletes payout rows on a test claim and keeps the firm statement line', async () => {
      const email = e2eEmail('payout');
      const userId = randomUUID();
      await sql`INSERT INTO shared.users (id, email, auth_provider) VALUES (${userId}::uuid, ${email}, 'magic_link')`;
      const [claim] = await sql`
        INSERT INTO claims.claims (user_id, status) VALUES (${userId}::uuid, 'submitted') RETURNING id`;
      const [firm] = await sql`
        INSERT INTO shared.law_firms (name) VALUES (${`E2E firm ${randomUUID().slice(0, 8)}`}) RETURNING id`;
      const [imp] = await sql`
        INSERT INTO claims.statement_imports (law_firm_id, file_name, file_kind, column_map, uploaded_by)
        VALUES (${firm.id}::uuid, 'statement.csv', 'csv', '{}'::jsonb, ${userId}::uuid) RETURNING id`;
      const [line] = await sql`
        INSERT INTO claims.statement_lines (import_id, law_firm_id, line_no, status, dedupe_hash, claim_id)
        VALUES (${imp.id}::uuid, ${firm.id}::uuid, 1, 'matched', ${randomUUID().replace(/-/g, '')}, ${claim.id}::uuid)
        RETURNING id`;
      const [release] = await sql`
        INSERT INTO claims.payout_releases (claim_id, amount_received_eur, value_date, fee_eur, law_firm_fee_eur, atlaes_share_eur, client_amount_eur)
        VALUES (${claim.id}::uuid, 5000, '2026-10-01', 487.5, 178.5, 309, 4512.5) RETURNING id`;
      const [receipt] = await sql`
        INSERT INTO claims.funds_receipts (claim_id, statement_line_id, amount_received, value_date, fee, law_firm_fee, atlaes_share, client_amount, fee_config, recorded_by)
        VALUES (${claim.id}::uuid, ${line.id}::uuid, 5000, '2026-10-01', 487.5, 178.5, 309, 4512.5, '{}'::jsonb, ${userId}::uuid)
        RETURNING id`;
      await sql`
        INSERT INTO claims.invoices (claim_id, funds_receipt_id, provider, status, gross_amount, tax_rate_percent, voucher_date)
        VALUES (${claim.id}::uuid, ${receipt.id}::uuid, 'none', 'pending', 309, 19, '2026-10-01')`;
      await sql`
        INSERT INTO claims.payout_lines (claim_id, payout_release_id, funds_receipt_id, kind, recipient, amount, account, transfer_method, reference)
        VALUES (${claim.id}::uuid, ${release.id}::uuid, ${receipt.id}::uuid, 'client', 'SPECIMEN', 4512.5, 'DE89370400440532013000', 'SEPA', 'E2E')`;

      const res = await post(
        '/api/e2e/cleanup',
        { emails: [email] },
        withSecret
      );
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, users: 1, claims: 1 });

      const left = await sql`
        SELECT
          (SELECT count(*) FROM claims.claims WHERE id = ${claim.id}::uuid) AS claims,
          (SELECT count(*) FROM claims.payout_releases WHERE claim_id = ${claim.id}::uuid) AS releases,
          (SELECT count(*) FROM claims.funds_receipts WHERE claim_id = ${claim.id}::uuid) AS receipts,
          (SELECT count(*) FROM claims.invoices WHERE claim_id = ${claim.id}::uuid) AS invoices,
          (SELECT count(*) FROM claims.payout_lines WHERE claim_id = ${claim.id}::uuid) AS lines,
          (SELECT count(*) FROM claims.statement_lines WHERE id = ${line.id}::uuid AND claim_id IS NULL) AS unmatched_line,
          (SELECT count(*) FROM claims.statement_imports WHERE id = ${imp.id}::uuid AND uploaded_by IS NULL) AS import_kept`;
      expect(left[0]).toEqual({
        claims: '0',
        releases: '0',
        receipts: '0',
        invoices: '0',
        lines: '0',
        unmatched_line: '1',
        import_kept: '1',
      });

      await sql`DELETE FROM claims.statement_imports WHERE id = ${imp.id}::uuid`;
      await sql`DELETE FROM shared.law_firms WHERE id = ${firm.id}::uuid`;
    });

    it('sweeps e2e rows older than the cutoff only', async () => {
      const oldEmail = e2eEmail('old');
      const newEmail = e2eEmail('new');
      await sql`INSERT INTO shared.users (email, auth_provider, created_at) VALUES (${oldEmail}, 'magic_link', now() - interval '3 hours')`;
      await sql`INSERT INTO shared.users (email, auth_provider) VALUES (${newEmail}, 'magic_link')`;

      const res = await post(
        '/api/e2e/cleanup',
        { olderThanMinutes: 120 },
        withSecret
      );
      expect(res.status).toBe(200);
      expect(res.body.users).toBeGreaterThanOrEqual(1);
      const rows =
        await sql`SELECT email FROM shared.users WHERE email IN (${oldEmail}, ${newEmail})`;
      expect(rows.map((r) => r.email)).toEqual([newEmail]);
    });
  });
});
