import { describe, expect, it } from 'vitest';
import {
  eligibilityCheckSchema,
  eligibilityLeadPayloadSchema,
  eligibilityReminderDueOn,
} from './gpr-eligibility';
import {
  formatFileFromLabel,
  renderEligibilityReminderEmail,
  renderEligibilityReviewTeamNotice,
} from './emails/gpr-eligibility';
import type { Lead } from '../../drizzle/schema/leads';

// GPR eligibility check (/check/3-step): date math, payload rules and mails.
//   pnpm vitest run src/services/leads/gpr-eligibility.test.ts

function futureFirstOfMonth(monthsAhead: number): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthsAhead, 1)
  )
    .toISOString()
    .slice(0, 10);
}

const answers = {
  citizenship: 'in',
  residence: 'IN',
  lastContributionMonth: '2025-03',
  effectiveLastMonth: '2025-03',
};

const base = {
  email: 'Someone@Example.com',
  ruleSet: 'GPR-ELIG-2026-11-10',
  result: 'PROCEED_FROM_DATE',
  answers,
};

describe('eligibilityReminderDueOn', () => {
  it('is the 1st of the month two months before the filing date', () => {
    expect(eligibilityReminderDueOn('2027-04-01')).toBe('2027-02-01');
    expect(eligibilityReminderDueOn('2027-04-20')).toBe('2027-02-01');
  });

  it('rolls back over the year boundary', () => {
    expect(eligibilityReminderDueOn('2027-01-01')).toBe('2026-11-01');
    expect(eligibilityReminderDueOn('2027-02-15')).toBe('2026-12-01');
  });
});

describe('eligibilityLeadPayloadSchema', () => {
  it('accepts a reminder and normalises e-mail and country codes', () => {
    const p = eligibilityLeadPayloadSchema.parse({
      ...base,
      kind: 'reminder',
      reminderOptIn: true,
      fileFrom: futureFirstOfMonth(6),
    });
    expect(p.email).toBe('someone@example.com');
    expect(p.answers.citizenship).toBe('IN');
    expect(p.blockReason).toBeNull();
  });

  it('needs the opt-in and a future filing date for a reminder', () => {
    const issues = (body: object) => {
      const r = eligibilityLeadPayloadSchema.safeParse(body);
      return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
    };
    expect(
      issues({ ...base, kind: 'reminder', fileFrom: futureFirstOfMonth(6) })
    ).toEqual(['reminderOptIn']);
    expect(
      issues({
        ...base,
        kind: 'reminder',
        reminderOptIn: false,
        fileFrom: futureFirstOfMonth(6),
      })
    ).toEqual(['reminderOptIn']);
    expect(issues({ ...base, kind: 'reminder', reminderOptIn: true })).toEqual([
      'fileFrom',
    ]);
    expect(
      issues({
        ...base,
        kind: 'reminder',
        reminderOptIn: true,
        fileFrom: '2020-01-01',
      })
    ).toEqual(['fileFrom']);
  });

  it('needs first and last name for a review; the message is capped at 500', () => {
    const r = eligibilityLeadPayloadSchema.safeParse({
      ...base,
      kind: 'review',
      result: 'NOT_NOW',
      blockReason: 'residence-eu-uk',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path.join('.')).sort()).toEqual([
        'firstName',
        'lastName',
      ]);
    }
    expect(
      eligibilityLeadPayloadSchema.safeParse({
        ...base,
        kind: 'review',
        result: 'NOT_NOW',
        firstName: 'A',
        lastName: 'B',
        message: 'x'.repeat(501),
      }).success
    ).toBe(false);
  });

  it('rejects malformed answers and unknown results', () => {
    const bad = (patch: object) =>
      eligibilityLeadPayloadSchema.safeParse({
        ...base,
        kind: 'review',
        firstName: 'A',
        lastName: 'B',
        ...patch,
      }).success;
    expect(bad({ result: 'ELIGIBLE' })).toBe(false);
    expect(bad({ answers: { ...answers, citizenship: 'IND' } })).toBe(false);
    expect(
      bad({ answers: { ...answers, effectiveLastMonth: '2025-13' } })
    ).toBe(false);
    expect(bad({ answers: { ...answers, localPension: 'maybe' } })).toBe(false);
    expect(bad({ answers: { ...answers, germanMonths: '60plus' } })).toBe(true);
  });
});

describe('early block (no months asked yet)', () => {
  it('accepts a review whose answers stop at citizenship / residence', () => {
    const r = eligibilityLeadPayloadSchema.safeParse({
      ...base,
      kind: 'review',
      result: 'NOT_NOW',
      blockReason: 'citizenship',
      firstName: 'A',
      lastName: 'B',
      answers: {
        citizenship: 'FR',
        residence: 'US',
        lastContributionMonth: null,
        effectiveLastMonth: null,
      },
      fileFrom: null,
    });
    expect(r.success).toBe(true);
  });
});

describe('eligibilityCheckSchema', () => {
  it('requires attestedAt as a timestamp', () => {
    expect(eligibilityCheckSchema.safeParse(base).success).toBe(false);
    expect(
      eligibilityCheckSchema.safeParse({ ...base, attestedAt: 'yesterday' })
        .success
    ).toBe(false);
    expect(
      eligibilityCheckSchema.safeParse({
        ...base,
        attestedAt: '2026-11-10T09:30:00.000Z',
      }).success
    ).toBe(true);
  });
});

describe('reminder mail', () => {
  const mail = renderEligibilityReminderEmail({
    firstName: null,
    fileFromLabel: formatFileFromLabel('2027-04-01'),
    checkUrl: 'https://germanypensionrefund.com/check/3-step',
    siteUrl: 'https://germanypensionrefund.com',
    senderName: 'Germany Pension Refund',
  });

  it('names the filing month and links the check', () => {
    expect(formatFileFromLabel('2027-04-01')).toBe('April 2027');
    expect(mail.subject).toBe(
      'Your German pension refund can be filed from April 2027'
    );
    expect(mail.html).toContain(
      'href="https://germanypensionrefund.com/check/3-step"'
    );
    expect(mail.text).toContain(
      'https://germanypensionrefund.com/check/3-step'
    );
    expect(mail.text).toContain('because you asked for a reminder');
  });

  it('never claims eligibility', () => {
    for (const part of [mail.subject, mail.html, mail.text]) {
      expect(part.toLowerCase()).not.toContain('eligible');
      expect(part.toLowerCase()).not.toContain('you qualify');
    }
  });
});

describe('review team notice', () => {
  it('lists the person, block reason, answers, message and attribution', () => {
    const lead = {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya@example.com',
      blockReason: 'residence-eu-uk',
      result: 'NOT_NOW',
      ruleSet: 'GPR-ELIG-2026-11-10',
      fileFrom: null,
      answers: { ...answers, citizenship: 'IN', residence: 'DE' },
      message: 'I moved to Spain last year.',
      widget: 'GPR-ELIGIBILITY',
      via: null,
      referrer: 'https://germanypensionrefund.com/check/3-step',
      landingPage: null,
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'refund',
      utmTerm: null,
      utmContent: null,
      gclid: 'abc',
      fbclid: null,
      submittedAt: null,
      createdAt: new Date('2026-11-10T10:00:00Z'),
    } as unknown as Lead;
    const n = renderEligibilityReviewTeamNotice(lead);
    expect(n.subject).toBe(
      'Free review request — Priya Sharma (Residence in the EU or the UK)'
    );
    expect(n.text).toContain('priya@example.com');
    expect(n.text).toContain('residence-eu-uk');
    expect(n.text).toContain('NOT_NOW');
    expect(n.text).toMatch(/residence:\s+DE/);
    expect(n.text).toMatch(/effectiveLastMonth:\s+2025-03/);
    expect(n.text).toContain('I moved to Spain last year.');
    expect(n.text).toContain('google / cpc / refund');
    expect(n.text).toContain('gclid');
  });
});
