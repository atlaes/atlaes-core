/**
 * Payout notification e-mails A1–A3 (platform brief 2026-09-16, section A),
 * text verbatim; placeholders filled from the case. Returned as plain text
 * with the button rendered as a link line so the existing mailer can wrap
 * it in the standard template.
 *
 * Triggers: A1 = funds received, decision not yet in (E1 only);
 * A2 = decision received, funds not yet in (E2 only); A3 = both on the
 * same day.
 */

import { EUR_EN } from './zahlungserklaerung';

export type PayoutNotificationKind = 'A1' | 'A2' | 'A3';

export interface PayoutNotificationInput {
  firstName: string;
  amountEur: number;
  /** Review deadline for the decision (A2/A3). */
  reviewBy?: Date | null;
  portalUrl: string;
  caseManagerSignature?: string;
}

export interface PayoutNotification {
  kind: PayoutNotificationKind;
  subject: string;
  text: string;
  buttonLabel: string;
}

export function pickPayoutNotification(input: {
  fundsReceivedAt: Date | null;
  decisionReceivedAt: Date | null;
}): PayoutNotificationKind | null {
  const sameDay = (a: Date, b: Date) =>
    a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
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

export function formatReviewDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function payoutNotification(
  kind: PayoutNotificationKind,
  input: PayoutNotificationInput
): PayoutNotification {
  const amount = `€${EUR_EN.format(input.amountEur)}`;
  const date = input.reviewBy ? formatReviewDate(input.reviewBy) : '[date]';
  const sig = input.caseManagerSignature ?? '[case manager signature]';
  const closing = `Thank you for trusting us with your refund.\n\nBest regards,\n${sig}`;

  if (kind === 'A1') {
    const buttonLabel = 'Authorise my payout';
    return {
      kind,
      subject: 'Your pension refund has arrived – please authorise your payout',
      buttonLabel,
      text: [
        `Hi ${input.firstName},`,
        `Good news: your German pension refund of ${amount} has arrived in our partner law firm’s escrow account.`,
        'Please log in to authorise your payout: confirm your bank details, choose how you would like the conversion handled if your account is not in euros, and sign the payment instruction on screen. Your account shows the full breakdown, including our service fee and the amount available for payout. Our fee is deducted directly from your refund — there is nothing to pay separately.',
        'The official decision letter usually arrives a few days after the payment. We will let you know as soon as it is in your account so you can check the periods it covers.',
        `${buttonLabel}: ${input.portalUrl}`,
        closing,
      ].join('\n\n'),
    };
  }
  if (kind === 'A2') {
    const buttonLabel = 'Review my decision';
    return {
      kind,
      subject: `Your refund decision is in – please review it by ${date}`,
      buttonLabel,
      text: [
        `Hi ${input.firstName},`,
        `Good news: your German pension refund of ${amount} has been approved! The official decision is now available in your account.`,
        `Please check that all your employment periods in Germany are listed. If anything is missing, report it in your account and upload the relevant payslips so we can help resolve it. The deadline for a formal objection is based on when our partner law firm received the decision, so please complete your review by ${date}.`,
        'The pension office generally pays the refund into our partner law firm’s escrow account within 1–9 days of the decision. As soon as it has arrived, we will ask you to confirm your bank details and sign the payment instruction.',
        `${buttonLabel}: ${input.portalUrl}`,
        closing,
      ].join('\n\n'),
    };
  }
  const buttonLabel = 'Review my decision and authorise payout';
  return {
    kind,
    subject:
      'Your pension refund has been approved – two short steps to your payout',
    buttonLabel,
    text: [
      `Hi ${input.firstName},`,
      `Good news: your German pension refund of ${amount} has been approved, and the money has already arrived in our partner law firm’s escrow account. The official decision is available in your account.`,
      'There are two steps to complete before the law firm can arrange your payout:',
      `- Review your decision by ${date}. Please check that all your employment periods in Germany are listed. If anything is missing, report it in your account and upload the relevant payslips so we can help resolve it. The deadline for a formal objection is based on when our partner law firm received the decision, so please complete your review by ${date}.`,
      '- Authorise your payout. Confirm your bank details and sign the payment instruction on screen. If your account is in a currency other than euros, you can also choose how you would like the conversion handled.',
      'Your account shows the full breakdown, including our service fee and the amount available for payout. Our fee is deducted directly from your refund — there is nothing to pay separately. Once your payment instruction is signed, the law firm arranges the transfer to your bank account.',
      `${buttonLabel}: ${input.portalUrl}`,
      closing,
    ].join('\n\n'),
  };
}
