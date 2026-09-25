import { describe, expect, it } from 'vitest';
import {
  applyFromDate,
  formatApplyLabel,
  isReminderDue,
  parseContributionMonth,
  reminderDueOn,
  reminderDueOnFor,
  toContributionMonth,
  toIsoDate,
} from './reminder';

describe('parseContributionMonth', () => {
  it('accepts YYYY-MM and YYYY-M', () => {
    expect(parseContributionMonth('2025-03')).toEqual({ year: 2025, month: 3 });
    expect(parseContributionMonth('2025-3')).toEqual({ year: 2025, month: 3 });
    expect(parseContributionMonth(' 2024-12 ')).toEqual({
      year: 2024,
      month: 12,
    });
  });

  it('rejects garbage, month 0/13 and implausible years', () => {
    expect(parseContributionMonth('')).toBeNull();
    expect(parseContributionMonth(null)).toBeNull();
    expect(parseContributionMonth('03/2025')).toBeNull();
    expect(parseContributionMonth('2025-00')).toBeNull();
    expect(parseContributionMonth('2025-13')).toBeNull();
    expect(parseContributionMonth('1900-01')).toBeNull();
  });

  it('toContributionMonth builds the canonical value from widget month/year', () => {
    expect(toContributionMonth('3', '2025')).toBe('2025-03');
    expect(toContributionMonth(12, 2024)).toBe('2024-12');
    expect(toContributionMonth('', '2025')).toBeNull();
    expect(toContributionMonth('13', '2025')).toBeNull();
  });
});

describe('reminder date math (+23 / +25 convention)', () => {
  it('last contribution March 2025 → reminder 1 Feb 2027, apply from 1 Apr 2027', () => {
    const cm = { year: 2025, month: 3 };
    expect(toIsoDate(reminderDueOn(cm))).toBe('2027-02-01');
    expect(toIsoDate(applyFromDate(cm))).toBe('2027-04-01');
  });

  it('rolls over year boundaries (December 2024 → Nov 2026 / Jan 2027)', () => {
    const cm = { year: 2024, month: 12 };
    expect(toIsoDate(reminderDueOn(cm))).toBe('2026-11-01');
    expect(toIsoDate(applyFromDate(cm))).toBe('2027-01-01');
  });

  it('January → reminder in December of the following year', () => {
    const cm = { year: 2025, month: 1 };
    expect(toIsoDate(reminderDueOn(cm))).toBe('2026-12-01');
    expect(toIsoDate(applyFromDate(cm))).toBe('2027-02-01');
  });

  it('reminderDueOnFor returns the date column value or null', () => {
    expect(reminderDueOnFor('2025-03')).toBe('2027-02-01');
    expect(reminderDueOnFor('nope')).toBeNull();
    expect(reminderDueOnFor(null)).toBeNull();
  });
});

describe('isReminderDue', () => {
  const cm = { year: 2025, month: 3 }; // due 2027-02-01

  it('is not due the day before', () => {
    expect(isReminderDue(cm, new Date('2027-01-31T23:59:59Z'))).toBe(false);
  });

  it('is due on the 1st (any time of day, UTC)', () => {
    expect(isReminderDue(cm, new Date('2027-02-01T00:00:00Z'))).toBe(true);
    expect(isReminderDue(cm, new Date('2027-02-01T06:00:00Z'))).toBe(true);
  });

  it('stays due afterwards (a missed day is caught by the next run)', () => {
    expect(isReminderDue(cm, new Date('2027-03-15T12:00:00Z'))).toBe(true);
  });
});

describe('formatApplyLabel', () => {
  it('renders the German "1. Monat Jahr" label used in the reminder', () => {
    expect(formatApplyLabel(new Date(Date.UTC(2027, 3, 1)))).toBe(
      '1. April 2027'
    );
    expect(formatApplyLabel(new Date(Date.UTC(2027, 2, 1)))).toBe(
      '1. März 2027'
    );
    expect(formatApplyLabel(applyFromDate({ year: 2024, month: 12 }))).toBe(
      '1. Januar 2027'
    );
  });
});
