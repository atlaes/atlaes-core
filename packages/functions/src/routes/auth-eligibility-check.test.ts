import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import auth from './auth';
import { gprSessionData } from '../test/fixtures';

// Account creation from the GPR eligibility funnel: the magic-link request
// carries `eligibilityCheck`, stored as a gpr-elig-signup lead.
//   pnpm vitest run src/routes/auth-eligibility-check.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

const stamp = Date.now();
const email = `test-elig-signup-${stamp}@example.com`;
const badEmail = `test-elig-signup-bad-${stamp}@example.com`;
const sessionEmail = `test-elig-signup-session-${stamp}@example.com`;

let testClient: ReturnType<typeof postgres>;
let app: Hono;

const check = {
  ruleSet: 'GPR-ELIG-2026-11-10',
  result: 'PROCEED',
  blockReason: null,
  answers: {
    citizenship: 'US',
    residence: 'US',
    lastContributionMonth: '2023-06',
    effectiveLastMonth: '2023-06',
    localPension: 'no',
    germanMonths: 'lt60',
  },
  attestedAt: '2026-11-10T09:30:00.000Z',
  utmSource: 'newsletter',
};

const request = (body: unknown) =>
  app.request('/api/auth/magic-link/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('magic-link request with eligibilityCheck', () => {
  beforeAll(() => {
    testClient = postgres(TEST_DATABASE_URL);
    app = new Hono();
    app.route('/api/auth', auth);
  });

  afterAll(async () => {
    try {
      const all = [email, badEmail, sessionEmail];
      await testClient`DELETE FROM gpr.leads WHERE email IN ${testClient(all)}`;
      await testClient`DELETE FROM gpr.calculation_logs WHERE session_id IN (SELECT id FROM gpr.pending_sessions WHERE email IN ${testClient(all)})`;
      await testClient`DELETE FROM gpr.pending_sessions WHERE email IN ${testClient(all)}`;
    } finally {
      await testClient.end();
    }
  });

  it('stores the attested check as a gpr-elig-signup lead, once', async () => {
    const res = await request({ email, eligibilityCheck: check });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { magicLink?: string }).magicLink).toContain(
      'token='
    );

    // A resent link with the same attestation stores nothing new.
    expect((await request({ email, eligibilityCheck: check })).status).toBe(
      200
    );

    const rows = await testClient`
      SELECT type, widget, rule_set, result, citizenship, residence,
             last_contribution_month, answers, attested_at, utm_source,
             delivery_email_sent_at, team_notice_sent_at, reminder_opt_in
        FROM gpr.leads WHERE email = ${email}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'gpr-elig-signup',
      widget: 'GPR-ELIGIBILITY',
      rule_set: 'GPR-ELIG-2026-11-10',
      result: 'PROCEED',
      citizenship: 'US',
      residence: 'US',
      last_contribution_month: '2023-06',
      utm_source: 'newsletter',
      delivery_email_sent_at: null,
      team_notice_sent_at: null,
      reminder_opt_in: false,
    });
    expect(new Date(rows[0].attested_at).toISOString()).toBe(check.attestedAt);
    expect(rows[0].answers).toMatchObject({ germanMonths: 'lt60' });
  });

  it('still sends the link when the record is malformed, and stores nothing', async () => {
    const { attestedAt: _a, ...noAttestation } = check;
    const res = await request({
      email: badEmail,
      eligibilityCheck: noAttestation,
    });
    expect(res.status).toBe(200);
    const rows =
      await testClient`SELECT 1 FROM gpr.leads WHERE email = ${badEmail}`;
    expect(rows).toHaveLength(0);
  });

  it('accepts the new eligibilityData fields on gprSessionData', async () => {
    const res = await request({
      email: sessionEmail,
      gprSessionData: {
        calculatorData: gprSessionData.calculatorData,
        eligibilityData: {
          ...gprSessionData.eligibilityData,
          secondCitizenship: null,
          ruleSet: 'GPR-ELIG-2026-11-10',
          result: 'PROCEED',
          blockReason: null,
        },
      },
    });
    expect(res.status).toBe(200);
    const rows =
      await testClient`SELECT 1 FROM gpr.pending_sessions WHERE email = ${sessionEmail}`;
    expect(rows).toHaveLength(1);
  });
});
