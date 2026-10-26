import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import vblReminders from './vbl-reminders';
import { processDueReminders } from '../services/leads';

// "Set reminder" for VBL waiting periods against a real database.
//   pnpm vitest run src/routes/vbl-reminders.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

const stamp = Date.now();
const email = `test-vbl-reminder-${stamp}@example.com`;

let testClient: ReturnType<typeof postgres>;
let app: Hono;

function futureFirstOfMonth(monthsAhead: number): string {
  const d = new Date();
  const t = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthsAhead, 1)
  );
  return t.toISOString().slice(0, 10);
}

const post = (body: unknown) =>
  app.request('/api/vbl/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/vbl/reminders', () => {
  beforeAll(() => {
    testClient = postgres(TEST_DATABASE_URL);
    app = new Hono();
    app.route('/api/vbl/reminders', vblReminders);
  });

  afterAll(async () => {
    try {
      await testClient`DELETE FROM gpr.leads WHERE email = ${email}`;
    } finally {
      await testClient.end();
    }
  });

  it('stores the reminder with its due date and sends nothing', async () => {
    const eligibleOn = futureFirstOfMonth(8);
    const res = await post({
      email: ` ${email.toUpperCase()} `,
      eligibleOn,
      source: 'calculator',
      pensionProvider: 'VddB',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      reminderDueOn: eligibleOn,
    });

    const rows =
      await testClient`SELECT type, widget, placement, reminder_opt_in, reminder_due_on::text AS due, delivery_email_sent_at, team_notice_sent_at FROM gpr.leads WHERE email = ${email}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'vbl-reminder',
      widget: 'VBL-CALCULATOR',
      placement: 'VddB',
      reminder_opt_in: true,
      due: eligibleOn,
      delivery_email_sent_at: null,
      team_notice_sent_at: null,
    });
  });

  it('is idempotent for the same e-mail and date', async () => {
    const eligibleOn = futureFirstOfMonth(8);
    const res = await post({ email, eligibleOn, source: 'get-started' });
    expect(res.status).toBe(200);
    const rows =
      await testClient`SELECT 1 FROM gpr.leads WHERE email = ${email}`;
    expect(rows).toHaveLength(1);
  });

  it('rejects past dates, bad e-mails and unknown sources', async () => {
    expect(
      (await post({ email, eligibleOn: '2020-01-01', source: 'calculator' }))
        .status
    ).toBe(400);
    expect(
      (
        await post({
          email: 'not-an-email',
          eligibleOn: futureFirstOfMonth(3),
          source: 'calculator',
        })
      ).status
    ).toBe(400);
    expect(
      (
        await post({
          email,
          eligibleOn: futureFirstOfMonth(3),
          source: 'other',
        })
      ).status
    ).toBe(400);
  });

  it('is not picked up by the GPR guide reminder job', async () => {
    const farFuture = new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000);
    await processDueReminders(farFuture);
    const [row] =
      await testClient`SELECT reminder_sent_at FROM gpr.leads WHERE email = ${email}`;
    expect(row.reminder_sent_at).toBeNull();
  });
});
