import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../drizzle/schema/shared';
import eligibilityLeads, { adminEligibilityLeads } from './eligibility-leads';
import { processDueReminders } from '../services/leads';
import { AuthService } from '../utils/auth';

// GPR eligibility check records (migration 0039) against a real database.
//   pnpm vitest run src/routes/eligibility-leads.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

const stamp = Date.now();
const reminderEmail = `test-elig-reminder-${stamp}@example.com`;
const reviewEmail = `test-elig-review-${stamp}@example.com`;
const botEmail = `test-elig-bot-${stamp}@example.com`;
const emails = [reminderEmail, reviewEmail, botEmail];

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;
const userIds: string[] = [];

// Response bodies are untyped JSON in these tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function futureFirstOfMonth(monthsAhead: number): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthsAhead, 1)
  )
    .toISOString()
    .slice(0, 10);
}

const answers = {
  citizenship: 'IN',
  secondCitizenship: null,
  residence: 'IN',
  lastContributionMonth: '2025-03',
  localPension: 'no',
  localPensionEndMonth: null,
  effectiveLastMonth: '2025-03',
  germanMonths: 'lt60',
};

const reminderBody = (fileFrom: string) => ({
  kind: 'reminder',
  email: ` ${reminderEmail.toUpperCase()} `,
  reminderOptIn: true,
  ruleSet: 'GPR-ELIG-2026-11-10',
  result: 'PROCEED_FROM_DATE',
  blockReason: null,
  answers,
  fileFrom,
  utm_source: 'google',
  utmCampaign: 'refund',
  landingPage: 'https://germanypensionrefund.com/check/3-step',
  submittedAt: new Date().toISOString(),
});

const reviewBody = {
  kind: 'review',
  email: reviewEmail,
  firstName: 'Priya',
  lastName: 'Sharma',
  message: 'I moved to Spain last year, does that matter?',
  ruleSet: 'GPR-ELIG-2026-11-10',
  result: 'NOT_NOW',
  blockReason: 'residence-eu-uk',
  answers: { ...answers, residence: 'ES' },
  referrer: 'https://germanypensionrefund.com/check/3-step',
};

const post = (body: unknown, contentType = 'application/json') =>
  app.request('/api/eligibility-leads', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const adminCall = (
  method: string,
  path: string,
  token: string,
  body?: unknown
) =>
  app.request(`/api/admin/eligibility-leads${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function makeUser(role: string) {
  const [user] = await testDb
    .insert(users)
    .values({
      email: `test-elig-${role}-${stamp}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role,
    })
    .returning();
  userIds.push(user.id);
  return AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: true,
    role,
  }).accessToken;
}

describe('POST /api/eligibility-leads', () => {
  beforeAll(() => {
    testClient = postgres(TEST_DATABASE_URL);
    testDb = drizzle(testClient);
    app = new Hono();
    app.route('/api/eligibility-leads', eligibilityLeads);
    app.route('/api/admin/eligibility-leads', adminEligibilityLeads);
  });

  afterAll(async () => {
    try {
      await testClient`DELETE FROM gpr.leads WHERE email IN ${testClient(emails)}`;
      if (userIds.length) {
        await testClient`DELETE FROM shared.users WHERE id IN ${testClient(userIds)}`;
      }
    } finally {
      await testClient.end();
    }
  });

  it('stores a reminder two months before the filing date, without mail', async () => {
    const fileFrom = futureFirstOfMonth(8);
    // text/plain, like the no-cors widgets.
    const res = await post(reminderBody(fileFrom), 'text/plain');
    expect(res.status).toBe(201);
    const data = (await res.json()) as Json;
    expect(data.success).toBe(true);
    expect(data.id).toEqual(expect.any(String));

    const rows = await testClient`
      SELECT type, widget, reminder_opt_in, reminder_due_on::text AS due,
             file_from::text AS file_from, can_apply_from, citizenship,
             residence, last_contribution_month, rule_set, result,
             block_reason, answers, utm_source, utm_campaign,
             delivery_email_sent_at, team_notice_sent_at, status
        FROM gpr.leads WHERE email = ${reminderEmail}`;
    expect(rows).toHaveLength(1);
    const [y, m] = fileFrom.split('-').map(Number);
    const due = new Date(Date.UTC(y, m - 3, 1)).toISOString().slice(0, 10);
    expect(rows[0]).toMatchObject({
      type: 'gpr-elig-reminder',
      widget: 'GPR-ELIGIBILITY',
      reminder_opt_in: true,
      due,
      file_from: fileFrom,
      can_apply_from: fileFrom,
      citizenship: 'IN',
      residence: 'IN',
      last_contribution_month: '2025-03',
      rule_set: 'GPR-ELIG-2026-11-10',
      result: 'PROCEED_FROM_DATE',
      block_reason: null,
      utm_source: 'google',
      utm_campaign: 'refund',
      delivery_email_sent_at: null,
      team_notice_sent_at: null,
      status: null,
    });
    expect(rows[0].answers).toMatchObject({
      citizenship: 'IN',
      effectiveLastMonth: '2025-03',
      germanMonths: 'lt60',
    });
  });

  it('is idempotent per e-mail and filing date while unsent', async () => {
    const fileFrom = futureFirstOfMonth(8);
    const res = await post(reminderBody(fileFrom));
    expect(res.status).toBe(201);
    const [row] =
      await testClient`SELECT id FROM gpr.leads WHERE email = ${reminderEmail}`;
    expect(((await res.json()) as Json).id).toBe(row.id);
    const rows =
      await testClient`SELECT 1 FROM gpr.leads WHERE email = ${reminderEmail}`;
    expect(rows).toHaveLength(1);
  });

  it('refuses a reminder without the opt-in or the filing date', async () => {
    const fileFrom = futureFirstOfMonth(8);
    expect(
      (await post({ ...reminderBody(fileFrom), reminderOptIn: false })).status
    ).toBe(400);
    const { fileFrom: _omit, ...noDate } = reminderBody(fileFrom);
    expect((await post(noDate)).status).toBe(400);
    expect((await post('{not json')).status).toBe(400);
  });

  it('sends the reminder once it is due, exactly once', async () => {
    const sentAt = async () => {
      const [row] =
        await testClient`SELECT reminder_sent_at FROM gpr.leads WHERE email = ${reminderEmail}`;
      return row.reminder_sent_at;
    };
    await processDueReminders(new Date());
    expect(await sentAt()).toBeNull();

    const [y, m] = futureFirstOfMonth(8).split('-').map(Number);
    const dueDay = new Date(Date.UTC(y, m - 3, 1, 6));
    const run = await processDueReminders(dueDay);
    expect(run.sent).toBeGreaterThanOrEqual(1);
    const first = await sentAt();
    expect(first).not.toBeNull();

    await processDueReminders(dueDay);
    expect(await sentAt()).toEqual(first);
  });

  it('stores a free-review request as open with names and message', async () => {
    const res = await post(reviewBody);
    expect(res.status).toBe(201);
    const rows = await testClient`
      SELECT type, status, first_name, last_name, message, block_reason,
             result, residence, reminder_opt_in, reminder_due_on,
             delivery_email_sent_at, referrer
        FROM gpr.leads WHERE email = ${reviewEmail}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'gpr-elig-review',
      status: 'open',
      first_name: 'Priya',
      last_name: 'Sharma',
      message: 'I moved to Spain last year, does that matter?',
      block_reason: 'residence-eu-uk',
      result: 'NOT_NOW',
      residence: 'ES',
      reminder_opt_in: false,
      reminder_due_on: null,
      // No mail to the visitor.
      delivery_email_sent_at: null,
      referrer: 'https://germanypensionrefund.com/check/3-step',
    });
  });

  it('refuses a review without names', async () => {
    const { firstName: _f, ...noFirst } = reviewBody;
    expect((await post(noFirst)).status).toBe(400);
  });

  it('answers a filled honeypot with success and stores nothing', async () => {
    const res = await post({
      ...reviewBody,
      email: botEmail,
      hp: 'http://spam.example',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const rows =
      await testClient`SELECT 1 FROM gpr.leads WHERE email = ${botEmail}`;
    expect(rows).toHaveLength(0);
  });

  describe('admin queue', () => {
    let adminToken: string;
    let userToken: string;

    beforeAll(async () => {
      adminToken = await makeUser('admin');
      userToken = await makeUser('user');
    });

    it('lists reviews by default and reminders on request, newest first', async () => {
      const res = await adminCall('GET', '', adminToken);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Json;
      const mine = data.leads.find((l: Json) => l.email === reviewEmail);
      expect(mine).toMatchObject({
        type: 'gpr-elig-review',
        firstName: 'Priya',
        blockReason: 'residence-eu-uk',
        status: 'open',
        repliedAt: null,
      });
      expect(mine.answers.residence).toBe('ES');
      expect(data.leads.every((l: Json) => l.type === 'gpr-elig-review')).toBe(
        true
      );
      const times = data.leads.map((l: Json) => l.createdAt);
      expect([...times].sort().reverse()).toEqual(times);

      const rem = (await (
        await adminCall('GET', '?type=reminder', adminToken)
      ).json()) as Json;
      const r = rem.leads.find((l: Json) => l.email === reminderEmail);
      expect(r.fileFrom).toBe(futureFirstOfMonth(8));
      expect(r.reminderSentAt).not.toBeNull();

      expect((await adminCall('GET', '?type=other', adminToken)).status).toBe(
        400
      );
    });

    it('sets the status and stamps repliedAt on replied', async () => {
      const [row] =
        await testClient`SELECT id FROM gpr.leads WHERE email = ${reviewEmail}`;
      const res = await adminCall('POST', `/${row.id}/status`, adminToken, {
        status: 'replied',
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as Json;
      expect(data.lead.status).toBe('replied');
      expect(data.lead.repliedAt).not.toBeNull();

      const closed = (await (
        await adminCall('POST', `/${row.id}/status`, adminToken, {
          status: 'closed',
        })
      ).json()) as Json;
      expect(closed.lead.status).toBe('closed');
      expect(closed.lead.repliedAt).toBe(data.lead.repliedAt);

      expect(
        (
          await adminCall('POST', `/${row.id}/status`, adminToken, {
            status: 'done',
          })
        ).status
      ).toBe(400);
      expect(
        (
          await adminCall(
            'POST',
            '/00000000-0000-4000-8000-000000000000/status',
            adminToken,
            { status: 'open' }
          )
        ).status
      ).toBe(404);
    });

    it('is closed to non-admins', async () => {
      expect((await adminCall('GET', '', userToken)).status).toBe(403);
      expect((await app.request('/api/admin/eligibility-leads')).status).toBe(
        401
      );
    });
  });
});
