/**
 * Payout notification e-mails A1–A3 (platform brief, Part 3 A), text
 * verbatim; placeholders filled from the case. Each notification carries
 * the plain-text part (`text`, button rendered as a "Label: url" line) and
 * the HTML part (`html`) laid out after Figma section C
 * (see `email-templates/layout.ts`). Send with
 * `email-templates/send.ts` → `sendPayoutNotificationEmail`.
 *
 * Triggers (brief Part 2 §3): A1 = funds received, decision not yet in
 * (E1 only); A2 = decision received, funds not yet in (E2 only); A3 = both
 * on the same day (Europe/Berlin calendar day).
 */

import { EUR_EN } from './zahlungserklaerung';
import { DEFAULT_COMMUNICATION_OWNER } from '../client-updates/case-columns';
import {
  renderPayoutEmailHtml,
  renderPayoutEmailText,
  type PayoutEmailBlock,
} from './email-templates/layout';

export type PayoutNotificationKind = 'A1' | 'A2' | 'A3';

export interface PayoutNotificationInput {
  firstName: string;
  amountEur: number;
  /** Review deadline for the decision (A2/A3) as shown to the client. */
  reviewBy?: Date | null;
  /**
   * Date the Bescheid was received at the law firm. Used when `reviewBy` is
   * not given: objection deadline = receipt + 1 month, shown to the client
   * minus 7 days (brief Part 2 §2).
   */
  decisionReceivedAtFirm?: Date | null;
  portalUrl: string;
  /** Defaults to the default communication owner (as client updates do). */
  caseManagerSignature?: string | null;
}

export interface PayoutNotification {
  kind: PayoutNotificationKind;
  subject: string;
  /** Plain-text part. */
  text: string;
  buttonLabel: string;
  /** HTML part (always set by `payoutNotification`). */
  html?: string;
  /** Inbox preview text (always set by `payoutNotification`). */
  preheader?: string;
}

const berlinDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function pickPayoutNotification(input: {
  fundsReceivedAt: Date | null;
  decisionReceivedAt: Date | null;
}): PayoutNotificationKind | null {
  const sameDay = (a: Date, b: Date) =>
    berlinDay.format(a) === berlinDay.format(b);
  if (
    input.fundsReceivedAt &&
    input.decisionReceivedAt &&
    sameDay(input.fundsReceivedAt, input.decisionReceivedAt)
  )
    return 'A3';
  if (input.fundsReceivedAt && !input.decisionReceivedAt) return 'A1';
  if (input.decisionReceivedAt && !input.fundsReceivedAt) return 'A2';
  return null;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * "14 October 2026" (default) or "14 Oct 2026" (`'short'`, as in the
 * Figma e-mails).
 */
export function formatReviewDate(
  d: Date,
  style: 'long' | 'short' = 'long'
): string {
  if (style === 'short')
    return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Receipt at the firm + 1 month (clamped to month end) − 7 days. */
export function reviewDeadlineFromReceipt(receivedAtFirm: Date): Date {
  const y = receivedAtFirm.getFullYear();
  const m = receivedAtFirm.getMonth() + 1;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const objection = new Date(
    y,
    m,
    Math.min(receivedAtFirm.getDate(), lastDay)
  );
  return new Date(
    objection.getFullYear(),
    objection.getMonth(),
    objection.getDate() - 7
  );
}

const CLOSING = 'Thank you for trusting us with your refund.';

export function payoutNotification(
  kind: PayoutNotificationKind,
  input: PayoutNotificationInput
): PayoutNotification {
  const amount = `€${EUR_EN.format(input.amountEur)}`;
  const signature =
    input.caseManagerSignature?.trim() || DEFAULT_COMMUNICATION_OWNER;

  const reviewDate = (): string => {
    const d =
      input.reviewBy ??
      (input.decisionReceivedAtFirm
        ? reviewDeadlineFromReceipt(input.decisionReceivedAtFirm)
        : null);
    if (!d)
      throw new Error(
        `Payout e-mail ${kind} needs reviewBy or decisionReceivedAtFirm`
      );
    return formatReviewDate(d, 'short');
  };

  let subject: string;
  let buttonLabel: string;
  let blocks: PayoutEmailBlock[];

  if (kind === 'A1') {
    subject = 'Your pension refund has arrived – please authorise your payout';
    buttonLabel = 'Authorise my payout';
    blocks = [
      { kind: 'p', text: `Hi ${input.firstName},` },
      {
        kind: 'p',
        text: `Good news: your German pension refund of ${amount} has arrived in our partner law firm’s escrow account.`,
      },
      {
        kind: 'p',
        text: 'Please log in to authorise your payout: confirm your bank details, choose how you would like the conversion handled if your account is not in euros, and sign the payment instruction on screen. Your account shows the full breakdown, including our service fee and the amount available for payout. Our fee is deducted directly from your refund — there is nothing to pay separately.',
      },
      {
        kind: 'p',
        text: 'The official decision letter usually arrives a few days after the payment. We will let you know as soon as it is in your account so you can check the periods it covers.',
      },
      { kind: 'button', label: buttonLabel, url: input.portalUrl },
    ];
  } else if (kind === 'A2') {
    const date = reviewDate();
    subject = `Your refund decision is in – please review it by ${date}`;
    buttonLabel = 'Review my decision';
    blocks = [
      { kind: 'p', text: `Hi ${input.firstName},` },
      {
        kind: 'p',
        text: `Good news: your German pension refund of ${amount} has been approved! The official decision is now available in your account.`,
      },
      {
        kind: 'p',
        text: `Please check that all your employment periods in Germany are listed. If anything is missing, report it in your account and upload the relevant payslips so we can help resolve it. The deadline for a formal objection is based on when our partner law firm received the decision, so please complete your review by ${date}.`,
      },
      {
        kind: 'p',
        text: 'The pension office generally pays the refund into our partner law firm’s escrow account within 1–9 days of the decision. As soon as it has arrived, we will ask you to confirm your bank details and sign the payment instruction.',
      },
      { kind: 'button', label: buttonLabel, url: input.portalUrl },
    ];
  } else {
    const date = reviewDate();
    subject =
      'Your pension refund has been approved – two short steps to your payout';
    buttonLabel = 'Review my decision and authorise payout';
    blocks = [
      { kind: 'p', text: `Hi ${input.firstName},` },
      {
        kind: 'p',
        text: `Good news: your German pension refund of ${amount} has been approved, and the money has already arrived in our partner law firm’s escrow account. The official decision is available in your account.`,
      },
      {
        kind: 'p',
        text: 'There are two steps to complete before the law firm can arrange your payout:',
      },
      {
        kind: 'bullets',
        items: [
          `Review your decision by ${date}. Please check that all your employment periods in Germany are listed. If anything is missing, report it in your account and upload the relevant payslips so we can help resolve it. The deadline for a formal objection is based on when our partner law firm received the decision, so please complete your review by ${date}.`,
          'Authorise your payout. Confirm your bank details and sign the payment instruction on screen. If your account is in a currency other than euros, you can also choose how you would like the conversion handled.',
        ],
      },
      {
        kind: 'p',
        text: 'Your account shows the full breakdown, including our service fee and the amount available for payout. Our fee is deducted directly from your refund — there is nothing to pay separately. Once your payment instruction is signed, the law firm arranges the transfer to your bank account.',
      },
      { kind: 'button', label: buttonLabel, url: input.portalUrl },
    ];
  }

  // Preview line = the mail's own opening sentence (no extra copy).
  const preheader = (blocks[1] as { text: string }).text;
  const content = { subject, preheader, blocks, closing: CLOSING, signature };
  return {
    kind,
    subject,
    buttonLabel,
    text: renderPayoutEmailText(content),
    html: renderPayoutEmailHtml(content),
    preheader,
  };
}
