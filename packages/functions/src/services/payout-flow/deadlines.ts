/**
 * Review-task dates (platform brief Part 2 §2): objection deadline = date
 * the Bescheid was received at the law firm + one month (owner decision);
 * the client sees the deadline minus 7 days. Pure date arithmetic on
 * ISO calendar dates (YYYY-MM-DD), no time zones involved.
 */

export type IsoDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(d: IsoDate): [number, number, number] {
  const m = ISO.exec(d);
  if (!m) throw new Error(`Invalid date: ${d}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function iso(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Same day next month; clamped to the month end (31 Jan → 28/29 Feb). */
export function addOneMonth(date: IsoDate): IsoDate {
  const [y, m, d] = parts(date);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return iso(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function addDaysIso(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export const CLIENT_REVIEW_LEAD_DAYS = 7;

export function objectionDeadline(receivedAtFirm: IsoDate): IsoDate {
  return addOneMonth(receivedAtFirm);
}

/** Deadline shown to the client: objection deadline − 7 days. */
export function clientReviewBy(receivedAtFirm: IsoDate): IsoDate {
  return addDaysIso(
    objectionDeadline(receivedAtFirm),
    -CLIENT_REVIEW_LEAD_DAYS
  );
}

export function reviewDates(receivedAtFirm: IsoDate): {
  objectionDeadline: IsoDate;
  clientReviewBy: IsoDate;
} {
  return {
    objectionDeadline: objectionDeadline(receivedAtFirm),
    clientReviewBy: clientReviewBy(receivedAtFirm),
  };
}

export function isIsoDate(v: unknown): v is IsoDate {
  if (typeof v !== 'string' || !ISO.test(v)) return false;
  const [y, m, d] = parts(v);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Today's calendar date in Europe/Berlin. */
export function todayBerlin(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
