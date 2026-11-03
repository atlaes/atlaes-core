/**
 * Which payout e-mails and admin tasks are due for a case right now
 * (owner spec "GPR and bAV escrow payouts", 30 Oct 2026: email selection,
 * timing and exception handling, acceptance checks). Pure: the service
 * builds a fresh snapshot immediately before sending, so a changed case
 * (funds arriving while E1B waits, a completed review, a hold) is always
 * re-checked; the e-mail log's event keys make every milestone and every
 * reminder occurrence go out once.
 *
 * Event keys:
 *   E1:<release>        payout invitation, E1A or E1C (one per payout)
 *   E1B:<decision>      review-only fallback
 *   RI:<decision>       marker: the review was invited (E1A or E1B)
 *   EM:<release>        missing-decision request
 *   E2:<release>:<n>    payout reminder on day n after the invitation
 *   E2B:<decision>      review reminder before the due date
 *   E3:<release>        authorisation received, payout queued
 *   E4:<release>        transfer sent (E4A own bank, E4B TransferMate)
 *   E5:<release>        arrival check / thank-you
 *   REVIEWINV:<claim>   marker: review invitation sent (once per client)
 */

import type { PayoutTimers } from '../ops-settings';
import type { PayoutTaskKind } from '../../drizzle/schema/payout-emails';
import type { PayoutProduct, PayoutTemplate } from './templates';
import {
  addDays,
  diffDays,
  isWorkingDay,
  nextWorkingDayOnOrAfter,
  type IsoDate,
} from '../client-updates/schedule';

export interface PlannerDecision {
  id: string;
  /** ATLAES's own receipt of the decision (timers run from here). */
  atlaesReceivedAt: IsoDate;
  /** Verified review due date shown to the client. */
  reviewBy: IsoDate;
  reviewOutcome: 'confirmed' | 'disputed' | null;
}

export interface PlannerRelease {
  id: string;
  status: 'open' | 'signed' | 'cancelled';
  fundsRecordedOn: IsoDate;
  invitedOn: IsoDate | null;
  /** Internal prerequisites done (invoice, Aktenzeichen, ATLAES account). */
  signable: boolean;
  route: 'A' | 'B' | 'C' | null;
  /** Payout lines exist in the law firm's queue. */
  queued: boolean;
  /** Katja's transfer of the client amount (route B: the funding). */
  clientLinePaidOn: IsoDate | null;
  onward: {
    transferDate: IsoDate | null;
    hasReceipt: boolean;
    expectedArrival: IsoDate | null;
  };
  /** Admin-entered expected arrival for a direct payment. */
  expectedArrival: IsoDate | null;
  receiptStatus: 'confirmed' | 'not_received' | null;
}

export interface PlannerCase {
  claimId: string;
  product: PayoutProduct;
  today: IsoDate;
  /** Latest published decision. */
  decision: PlannerDecision | null;
  /** A client-uploaded decision waits for admin verification. */
  pendingUpload: boolean;
  releases: PlannerRelease[];
  payoutHold: boolean;
  /** Contact pause in force (before the next-contact date). */
  contactPaused: boolean;
  /** The decision is known to have gone to the client directly. */
  decisionDirectToClient: boolean;
  /** Event keys already in the e-mail log. */
  sent: ReadonlySet<string>;
  timers: PayoutTimers;
}

export type PlannedAction =
  | {
      kind: 'email';
      template: PayoutTemplate;
      key: string;
      releaseId: string | null;
      /** Further keys this send settles (markers, superseded reminders). */
      alsoKeys: string[];
      /** E1A/E1C: stamp the release's first invitation. */
      marksInvitation?: boolean;
      /** E5: carries the review invitation. */
      inviteReview?: boolean;
      /** E2A/E1A after the review date: the "as soon as possible" text. */
      reviewOverdue?: boolean;
    }
  | {
      kind: 'task';
      task: PayoutTaskKind;
      key: string;
      releaseId: string | null;
      urgent: boolean;
      detail: string;
    };

export function addWorkingDays(date: IsoDate, n: number): IsoDate {
  let d = date;
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    if (isWorkingDay(d)) left -= 1;
  }
  return d;
}

/** Expected arrival at the client's bank, or null (E5 unscheduled). */
export function expectedArrival(
  r: PlannerRelease,
  timers: PayoutTimers
): IsoDate | null {
  if (r.route === 'B') return r.onward.expectedArrival;
  if (r.expectedArrival) return r.expectedArrival;
  if (r.clientLinePaidOn && timers.directArrivalWorkingDays !== null)
    return addWorkingDays(r.clientLinePaidOn, timers.directArrivalWorkingDays);
  return null;
}

export function planPayoutActions(c: PlannerCase): PlannedAction[] {
  const out: PlannedAction[] = [];
  const t = c.timers;
  const has = (key: string) => c.sent.has(key);
  const email = (
    template: PayoutTemplate,
    key: string,
    releaseId: string | null,
    extra: Partial<Extract<PlannedAction, { kind: 'email' }>> = {}
  ) => {
    if (has(key)) return;
    out.push({
      kind: 'email',
      template,
      key,
      releaseId,
      alsoKeys: [],
      ...extra,
    });
  };
  const task = (
    taskKind: PayoutTaskKind,
    key: string,
    detail: string,
    releaseId: string | null = null,
    urgent = false
  ) =>
    out.push({
      kind: 'task',
      task: taskKind,
      key,
      releaseId,
      urgent,
      detail,
    });

  const d = c.decision;
  const live = c.releases.filter((r) => r.status !== 'cancelled');
  const open = live.find((r) => r.status === 'open') ?? null;
  const reviewOpen = !!d && !d.reviewOutcome;
  const reviewPassed = !!d && c.today > d.reviewBy;
  const reviewInvited = !!d && has(`RI:${d.id}`);

  // 1. Payout invitation: decision published, funds matched, calculation
  //    ready, no hold. E1A while the review is outstanding, else E1C.
  let invitationNow = false;
  if (open && d && !c.payoutHold && open.signable && !c.contactPaused) {
    const key = `E1:${open.id}`;
    if (!has(key)) {
      invitationNow = true;
      email(reviewOpen ? 'E1A' : 'E1C', key, open.id, {
        alsoKeys: reviewOpen ? [`RI:${d.id}`] : [],
        marksInvitation: true,
        reviewOverdue: reviewOpen && reviewPassed,
      });
    }
  }

  // 2. Decision published, no funds yet.
  if (d && live.length === 0) {
    const since = diffDays(d.atlaesReceivedAt, c.today);
    const fallbackDue = since >= t.missingFundsDays;
    const lateDue = diffDays(c.today, d.reviewBy) < t.lateReviewDays;
    if (fallbackDue)
      task(
        'missing_funds',
        `missing_funds:${d.id}`,
        `No funds matched ${since} days after the decision was received (${d.atlaesReceivedAt}). Check unmatched receipts and bank records, then follow up with the law firm and the payer.`
      );
    if (reviewOpen && !reviewInvited && (fallbackDue || lateDue)) {
      if (!c.contactPaused)
        email('E1B', `E1B:${d.id}`, null, { alsoKeys: [`RI:${d.id}`] });
      if (lateDue)
        task(
          'review_late_document',
          `review_late:${d.id}`,
          reviewPassed
            ? `The review due date (${d.reviewBy}) has already passed and the client was not yet invited to review.`
            : `The review is due on ${d.reviewBy}, fewer than ${t.lateReviewDays} days away; the decision reached us late.`,
          null,
          true
        );
    }
  }

  // 3. Funds matched, no published decision.
  if (!d && live.length > 0) {
    const first = live[0];
    const since = diffDays(first.fundsRecordedOn, c.today);
    const due = since >= t.missingDecisionDays;
    if (due)
      task(
        'missing_decision',
        `missing_decision:${first.id}`,
        `Funds were matched on ${first.fundsRecordedOn} but no verified decision is on file after ${since} days. Obtain a copy through the law firm or the issuing institution if the client cannot upload it.`,
        first.id
      );
    if (
      !c.pendingUpload &&
      !c.contactPaused &&
      (due || c.decisionDirectToClient)
    )
      email('EM', `EM:${first.id}`, first.id);
  }

  // 4. Payout reminders on day 7 / 14 after the invitation. Several due
  //    at once (after a pause) → only the latest goes; the rest settle.
  let combinedReview = false;
  if (open && open.invitedOn && !c.payoutHold && !c.contactPaused) {
    const elapsed = diffDays(open.invitedOn, c.today);
    const due = [...t.reminderDays]
      .sort((a, b) => a - b)
      .filter((n) => n > 0 && elapsed >= n && elapsed < t.followUpDays);
    const latest = due[due.length - 1];
    if (latest !== undefined && !has(`E2:${open.id}:${latest}`)) {
      const earlier = due
        .filter((n) => n !== latest)
        .map((n) => `E2:${open.id}:${n}`);
      const reviewReminderDue =
        reviewOpen &&
        !reviewPassed &&
        diffDays(c.today, d!.reviewBy) <= t.reviewReminderDaysBefore;
      combinedReview = reviewReminderDue;
      email(reviewOpen ? 'E2A' : 'E2C', `E2:${open.id}:${latest}`, open.id, {
        alsoKeys: [...earlier, ...(reviewReminderDue ? [`E2B:${d!.id}`] : [])],
        reviewOverdue: reviewOpen && reviewPassed,
      });
    }
  }

  // 5. Review reminder before the due date (never with a past date; an
  //    overdue review goes to admin instead).
  if (
    d &&
    reviewOpen &&
    !reviewPassed &&
    !combinedReview &&
    !invitationNow &&
    reviewInvited &&
    !c.contactPaused &&
    diffDays(c.today, d.reviewBy) <= t.reviewReminderDaysBefore
  )
    email('E2B', `E2B:${d.id}`, null);

  // 6. Review due date passed: urgent admin task; silence is no acceptance.
  if (d && reviewOpen && reviewPassed)
    task(
      'review_overdue',
      `review_overdue:${d.id}`,
      `The client has not reviewed the decision; the review was due on ${d.reviewBy}. Silence is not acceptance.`,
      null,
      true
    );

  // 7. No signature 30 days after the invitation: personal follow-up.
  if (
    open &&
    open.invitedOn &&
    diffDays(open.invitedOn, c.today) >= t.followUpDays
  )
    task(
      'no_signature',
      `no_signature:${open.id}`,
      `The payment instruction is still unsigned ${diffDays(open.invitedOn, c.today)} days after the payout invitation. Contact the client personally and set the next contact date.`,
      open.id
    );

  for (const r of live) {
    if (r.status !== 'signed') continue;
    // 8. E3 once the signed instruction is stored and the payout queued.
    if (r.queued && !r.clientLinePaidOn) email('E3', `E3:${r.id}`, r.id);

    // 9. Transfer e-mails.
    if (r.route === 'B') {
      const o = r.onward;
      const complete = !!(o.transferDate && o.hasReceipt && o.expectedArrival);
      if (complete) email('E4B', `E4:${r.id}`, r.id);
      else if (r.clientLinePaidOn)
        task(
          'transfer_record_incomplete',
          `onward:${r.id}`,
          `The law firm funded TransferMate on ${r.clientLinePaidOn}. Record the onward payment: final amount and currency, transfer date, expected arrival and the client's transfer receipt (E4B waits for all of them).`,
          r.id
        );
    } else if (r.clientLinePaidOn) {
      // Working-day rule: weekend payments are notified on Monday.
      if (c.today >= nextWorkingDayOnOrAfter(r.clientLinePaidOn))
        email('E4A', `E4:${r.id}`, r.id);
    }

    // 10. Arrival check, never from the TransferMate funding date.
    if (r.receiptStatus === 'not_received') {
      task(
        'payment_not_received',
        `not_received:${r.id}`,
        'The client reported that the payment has not arrived. Investigate the transfer; review invitations stay stopped until it is resolved.',
        r.id,
        true
      );
      continue;
    }
    const arrival = expectedArrival(r, t);
    if (
      arrival &&
      has(`E4:${r.id}`) &&
      c.today >= addWorkingDays(arrival, t.arrivalCheckWorkingDays)
    ) {
      const inviteReview = !has(`REVIEWINV:${c.claimId}`);
      email('E5', `E5:${r.id}`, r.id, {
        inviteReview,
        alsoKeys: inviteReview ? [`REVIEWINV:${c.claimId}`] : [],
      });
    }
  }

  return out;
}
