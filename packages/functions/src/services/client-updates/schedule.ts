/**
 * Schedule maths for the client-update engine ("Rules for Karl" →
 * "Schedule (all from submissionDate)"). Pure functions over calendar
 * dates; no clock, no database.
 *
 * One clock: every milestone and interval runs from the submission date —
 * the day the law firm posted the claim. Three, five and six months are
 * calendar months from that date (a month without a matching day → its
 * last day); 28 and 14 days are the maximum update intervals. An office
 * transfer changes nothing.
 */

/** ISO calendar date, `YYYY-MM-DD`. All schedule values are of this form. */
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value: IsoDate): Date {
  const m = ISO_DATE.exec(value);
  if (!m) throw new Error(`Invalid ISO date: ${value}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date (UTC) unless a fixed date is supplied. */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

function daysInMonth(year: number, monthIndex: number): number {
  // Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Calendar months forward, clamped to the last day of the target month
 * when the source day does not exist there (31 Jan + 1 → 28/29 Feb,
 * 31 Aug + 3 → 30 Nov).
 */
export function addCalendarMonths(date: IsoDate, months: number): IsoDate {
  const d = parseIsoDate(date);
  const year = d.getUTCFullYear();
  const monthIndex = d.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(targetYear, targetMonth));
  return toIsoDate(new Date(Date.UTC(targetYear, targetMonth, day)));
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  const ms = parseIsoDate(to).getTime() - parseIsoDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function minIso(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}

export function maxIso(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

/** Working days are Monday–Friday (no public-holiday calendar). */
export function isWorkingDay(date: IsoDate): boolean {
  const dow = parseIsoDate(date).getUTCDay();
  return dow >= 1 && dow <= 5;
}

/** The last working day strictly before `date`. */
export function previousWorkingDay(date: IsoDate): IsoDate {
  let d = addDays(date, -1);
  while (!isWorkingDay(d)) d = addDays(d, -1);
  return d;
}

/** The first working day on or after `date`. */
export function nextWorkingDayOnOrAfter(date: IsoDate): IsoDate {
  let d = date;
  while (!isWorkingDay(d)) d = addDays(d, 1);
  return d;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export const FIRST_UPDATE_DAYS = 28;
export const ROUTINE_INTERVAL_DAYS = 28;
export const FORTNIGHTLY_INTERVAL_DAYS = 14;
export const STATUS_ENQUIRY_MONTHS = 3;
export const WRITTEN_REMINDER_REVIEW_MONTHS = 5;
export const SENIOR_REVIEW_MONTHS = 6;
export const POSTING_DATE_WARNING_DAYS = 7;

export interface Milestones {
  submissionDate: IsoDate; // M0 day
  firstUpdateDue: IsoDate; // + 28 days
  statusEnquiryDue: IsoDate; // + 3 calendar months
  writtenReminderReviewDue: IsoDate; // + 5 calendar months
  seniorReviewDue: IsoDate; // + 6 calendar months
  fortnightlyFrom: IsoDate; // + 6 calendar months
}

export function milestones(submissionDate: IsoDate): Milestones {
  return {
    submissionDate,
    firstUpdateDue: addDays(submissionDate, FIRST_UPDATE_DAYS),
    statusEnquiryDue: addCalendarMonths(submissionDate, STATUS_ENQUIRY_MONTHS),
    writtenReminderReviewDue: addCalendarMonths(
      submissionDate,
      WRITTEN_REMINDER_REVIEW_MONTHS
    ),
    seniorReviewDue: addCalendarMonths(submissionDate, SENIOR_REVIEW_MONTHS),
    fortnightlyFrom: addCalendarMonths(submissionDate, SENIOR_REVIEW_MONTHS),
  };
}

/** Whether `asOf` is at or past the six-month mark. */
export function isFortnightlyPhase(
  submissionDate: IsoDate,
  asOf: IsoDate
): boolean {
  return asOf >= milestones(submissionDate).fortnightlyFrom;
}

/**
 * Maximum days between two client updates when one is sent on `sentOn`:
 * 28, or 14 from the six-month mark. At the six-month mark the next update
 * is pulled forward: if a 28-day gap would run past + 6 months, the gap is
 * 14 days so the update is ≤ 14 days after the last substantive one.
 */
export function updateIntervalDays(
  submissionDate: IsoDate,
  sentOn: IsoDate
): number {
  const sixMonths = milestones(submissionDate).fortnightlyFrom;
  if (sentOn >= sixMonths) return FORTNIGHTLY_INTERVAL_DAYS;
  if (addDays(sentOn, ROUTINE_INTERVAL_DAYS) >= sixMonths) {
    return FORTNIGHTLY_INTERVAL_DAYS;
  }
  return ROUTINE_INTERVAL_DAYS;
}

/** Latest date the next update may be promised for after a send. */
export function latestNextUpdate(
  submissionDate: IsoDate,
  sentOn: IsoDate
): IsoDate {
  return addDays(sentOn, updateIntervalDays(submissionDate, sentOn));
}

/**
 * The date to store as nextClientUpdateDue after a successful send. The
 * date promised in the e-mail wins when it is within the interval; a later
 * promise is clamped to the interval; no promise → the interval.
 */
export function nextUpdateDueAfterSend(input: {
  submissionDate: IsoDate;
  sentOn: IsoDate;
  promisedDate?: IsoDate | null;
}): IsoDate {
  const latest = latestNextUpdate(input.submissionDate, input.sentOn);
  if (!input.promisedDate) return latest;
  if (input.promisedDate <= input.sentOn) return latest;
  return minIso(input.promisedDate, latest);
}

/** The first client date after M0: submission + 28 days. */
export function initialNextUpdateDue(submissionDate: IsoDate): IsoDate {
  return addDays(submissionDate, FIRST_UPDATE_DAYS);
}

/**
 * When the draft has to exist: at least one working day before the
 * promised date. Returns the calendar day on which the cron creates it.
 */
export function draftReadyDate(dueDate: IsoDate): IsoDate {
  return previousWorkingDay(dueDate);
}

export function isDraftDue(dueDate: IsoDate, today: IsoDate): boolean {
  return today >= draftReadyDate(dueDate);
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

export type WarningKind =
  | 'customer_update_overdue'
  | 'office_action_overdue'
  | 'posting_date_unconfirmed'
  | 'funds_before_decision';

export interface CaseWarning {
  kind: WarningKind;
  since: IsoDate; // the date the condition became true
  detail: string;
}

export interface OfficeActionForWarnings {
  type: string;
  label: string;
  dueDate: IsoDate;
  status: 'open' | 'done' | 'rescheduled';
}

export interface CaseForWarnings {
  /** When the completed case was handed to the law firm (release). */
  handoffDate: IsoDate | null;
  submissionDate: IsoDate | null;
  nextClientUpdateDue: IsoDate | null;
  lastClientUpdateSent: IsoDate | null;
  nextOfficeAction: OfficeActionForWarnings | null;
  decisionReceivedAt: IsoDate | null;
  fundsReceivedAt: IsoDate | null;
  stoppedAt: IsoDate | null;
}

/**
 * Posting date unconfirmed 7 days after handoff → admin warning. Never
 * backdate: the warning stays until the firm's date arrives.
 */
export function isPostingDateUnconfirmed(
  handoffDate: IsoDate | null,
  submissionDate: IsoDate | null,
  today: IsoDate
): boolean {
  if (!handoffDate || submissionDate) return false;
  return today >= addDays(handoffDate, POSTING_DATE_WARNING_DAYS);
}

export function isCustomerUpdateOverdue(
  nextClientUpdateDue: IsoDate | null,
  today: IsoDate
): boolean {
  return !!nextClientUpdateDue && today > nextClientUpdateDue;
}

export function isOfficeActionOverdue(
  action: OfficeActionForWarnings | null,
  today: IsoDate
): boolean {
  return !!action && action.status !== 'done' && today > action.dueDate;
}

export function isFundsBeforeDecision(
  decisionReceivedAt: IsoDate | null,
  fundsReceivedAt: IsoDate | null
): boolean {
  return !!fundsReceivedAt && !decisionReceivedAt;
}

/**
 * All admin warnings for a case on `today`. An overdue office action never
 * suppresses the customer warning (both are listed); an unrelated contact
 * never clears the office action (only its own status does).
 */
export function computeWarnings(
  c: CaseForWarnings,
  today: IsoDate
): CaseWarning[] {
  const out: CaseWarning[] = [];
  if (isPostingDateUnconfirmed(c.handoffDate, c.submissionDate, today)) {
    out.push({
      kind: 'posting_date_unconfirmed',
      since: addDays(c.handoffDate!, POSTING_DATE_WARNING_DAYS),
      detail: `Handed to the law firm on ${c.handoffDate}; no posting date confirmed.`,
    });
  }
  if (!c.stoppedAt && isCustomerUpdateOverdue(c.nextClientUpdateDue, today)) {
    out.push({
      kind: 'customer_update_overdue',
      since: addDays(c.nextClientUpdateDue!, 1),
      detail: `Client update promised for ${c.nextClientUpdateDue} has not been sent.`,
    });
  }
  if (!c.stoppedAt && isOfficeActionOverdue(c.nextOfficeAction, today)) {
    out.push({
      kind: 'office_action_overdue',
      since: addDays(c.nextOfficeAction!.dueDate, 1),
      detail: `${c.nextOfficeAction!.label} was due on ${c.nextOfficeAction!.dueDate}.`,
    });
  }
  if (isFundsBeforeDecision(c.decisionReceivedAt, c.fundsReceivedAt)) {
    out.push({
      kind: 'funds_before_decision',
      since: c.fundsReceivedAt!,
      detail:
        'Funds arrived before the decision: reconcile the case; no decision-review e-mail without a decision.',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Stage (client account stepper: Preparing / Submitted / Decision / Payout)
// ---------------------------------------------------------------------------

export type CaseStage = 'preparing' | 'submitted' | 'decision' | 'payout';

export function stageFor(c: {
  submissionDate: IsoDate | null;
  decisionReceivedAt: IsoDate | null;
  fundsReceivedAt: IsoDate | null;
}): CaseStage {
  // A later status is shown only when the case supports it: funds without
  // a decision stays at "submitted" until reconciled.
  if (c.decisionReceivedAt && c.fundsReceivedAt) return 'payout';
  if (c.decisionReceivedAt) return 'decision';
  if (c.submissionDate) return 'submitted';
  return 'preparing';
}

/** Whether the waiting sequence is still running for this case. */
export function isSequenceActive(c: {
  submissionDate: IsoDate | null;
  stoppedAt: IsoDate | null;
}): boolean {
  return !!c.submissionDate && !c.stoppedAt;
}

// ---------------------------------------------------------------------------
// Office actions the schedule creates
// ---------------------------------------------------------------------------

export interface ScheduledOfficeAction {
  type: 'status_enquiry' | 'written_reminder_review' | 'senior_review';
  label: string;
  dueDate: IsoDate;
}

/** The next schedule-driven office action after `asOf` (none once past + 6). */
export function nextScheduledOfficeAction(
  submissionDate: IsoDate,
  asOf: IsoDate
): ScheduledOfficeAction | null {
  const m = milestones(submissionDate);
  const all: ScheduledOfficeAction[] = [
    {
      type: 'status_enquiry',
      label: 'Contact the pension office to check where the application stands',
      dueDate: m.statusEnquiryDue,
    },
    {
      type: 'written_reminder_review',
      label: 'Review whether a written reminder should be sent',
      dueDate: m.writtenReminderReviewDue,
    },
    {
      type: 'senior_review',
      label: 'Senior review of the case and the follow-up so far',
      dueDate: m.seniorReviewDue,
    },
  ];
  return all.find((a) => a.dueDate >= asOf) ?? null;
}

/** Default follow-up after a transfer: confirm receipt at the new office. */
export const TRANSFER_CONFIRM_RECEIPT_DAYS = 14;

export function transferConfirmReceiptDue(contactDate: IsoDate): IsoDate {
  return addDays(contactDate, TRANSFER_CONFIRM_RECEIPT_DAYS);
}

/** Format an ISO date the way the client e-mails print dates (en-GB long). */
export function formatLongDate(date: IsoDate): string {
  return parseIsoDate(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
