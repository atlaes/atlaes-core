/**
 * Waiting-period reminder date math (pure, DB-free).
 *
 * 24 full calendar months AFTER the last insured month: the application is
 * possible from the 1st of month +25. The reminder goes out about two
 * months earlier, on the 1st of month +23. Same +25 convention as the
 * eligibility / Wartefrist widgets and checkGuideReminders() in the Apps
 * Script. All dates are calendar dates (UTC midnight); the cron compares
 * `reminder_due_on` against the current calendar day.
 */

export const REMINDER_OFFSET_MONTHS = 23;
export const APPLY_OFFSET_MONTHS = 25;

const GERMAN_MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export interface ContributionMonth {
  year: number;
  month: number; // 1-12
}

/** Accepts 'YYYY-MM' (also tolerates 'YYYY-M'). Returns null when invalid. */
export function parseContributionMonth(
  value: string | null | undefined
): ContributionMonth | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  if (year < 1950 || year > 2100) return null;
  return { year, month };
}

/** Builds the canonical 'YYYY-MM' from separate month/year values. */
export function toContributionMonth(
  month: number | string,
  year: number | string
): string | null {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || !Number.isInteger(y)) return null;
  const parsed = parseContributionMonth(`${y}-${String(m).padStart(2, '0')}`);
  return parsed
    ? `${parsed.year}-${String(parsed.month).padStart(2, '0')}`
    : null;
}

function firstOfMonthPlus(cm: ContributionMonth, offsetMonths: number): Date {
  return new Date(Date.UTC(cm.year, cm.month - 1 + offsetMonths, 1));
}

/** 1st of month +23 (UTC midnight). */
export function reminderDueOn(cm: ContributionMonth): Date {
  return firstOfMonthPlus(cm, REMINDER_OFFSET_MONTHS);
}

/** 1st of month +25 (UTC midnight): first possible application day. */
export function applyFromDate(cm: ContributionMonth): Date {
  return firstOfMonthPlus(cm, APPLY_OFFSET_MONTHS);
}

/** 'YYYY-MM-DD' for date columns. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** '1. März 2027' — the label used in the reminder body. */
export function formatApplyLabel(d: Date): string {
  return `${d.getUTCDate()}. ${GERMAN_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Whether the reminder is due on the given day: the calendar day of `now`
 * (UTC) is on or after the 1st of month +23.
 */
export function isReminderDue(cm: ContributionMonth, now: Date): boolean {
  return toIsoDate(now) >= toIsoDate(reminderDueOn(cm));
}

/** Convenience for the create path: due date from the raw 'YYYY-MM' value. */
export function reminderDueOnFor(
  lastContributionMonth: string | null | undefined
): string | null {
  const cm = parseContributionMonth(lastContributionMonth);
  return cm ? toIsoDate(reminderDueOn(cm)) : null;
}
