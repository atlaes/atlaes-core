/**
 * Escrow payout e-mails E1A–E5 (owner spec "GPR and bAV escrow payouts",
 * v1.0, 30 Oct 2026, e-mail appendix). Text verbatim; square-bracket
 * fields are filled from the case and the product fields below, so the
 * same templates serve Germany Pension Refund and CompanyPension.
 *
 * Pure: `payoutEmail()` returns subject, preheader and blocks; the layout
 * (`email-templates/layout.ts`) renders HTML and text.
 */

import type { PayoutEmailBlock } from '../gpr-payout/email-templates/layout';

export const PAYOUT_TEMPLATE_VERSION = 'v1.0-2026-10-30';

export const PAYOUT_TEMPLATES = [
  'E1A',
  'E1B',
  'E1C',
  'E2A',
  'E2B',
  'E2C',
  'EM',
  'E3',
  'E4A',
  'E4B',
  'E5',
] as const;
export type PayoutTemplate = (typeof PAYOUT_TEMPLATES)[number];

export type PayoutProduct = 'gpr' | 'bav';

/** Product wording (spec "Email configuration"). */
export const PRODUCT_FIELDS: Record<
  PayoutProduct,
  {
    brand: string;
    paymentDescription: string;
    decisionDescription: string;
    reviewDocument: string;
    reviewGuidance: string;
    combinedButton: string;
    reviewButton: string;
  }
> = {
  gpr: {
    brand: 'Germany Pension Refund',
    paymentDescription: 'pension refund',
    decisionDescription: 'official refund decision',
    reviewDocument: 'refund decision',
    reviewGuidance:
      'Check the periods and contributions listed, and let us know through your account if anything appears missing or incorrect.',
    combinedButton: 'Review my refund and authorise payout',
    reviewButton: 'Review my refund decision',
  },
  bav: {
    brand: 'CompanyPension',
    paymentDescription: 'company pension payout',
    decisionDescription: 'provider’s payout statement',
    reviewDocument: 'payout statement',
    reviewGuidance:
      'Check the amount and calculation shown in the statement, and let us know through your account if anything appears missing or incorrect.',
    combinedButton: 'Review my statement and authorise payout',
    reviewButton: 'Review my payout statement',
  },
};

export interface PayoutEmailVars {
  product: PayoutProduct;
  firstName: string;
  /** "€4,256.50" — formatted by the caller. */
  amountReceived?: string;
  /** Full date ("14 October 2026"); null once the review date has passed. */
  reviewDeadline?: string | null;
  /** Links into the client account (the case opens after sign-in). */
  links: {
    review: string;
    payout: string;
    decisionUpload: string;
    receipt: string;
  };
  /** E3: an assigned manager writes "I'm sorry", a team "We're sorry". */
  hasManager?: boolean;
  /** E4A */
  amountSent?: string;
  transferDate?: string;
  bankName?: string | null;
  accountEnding?: string | null;
  /** E4B */
  finalAmount?: string;
  onwardTransferDate?: string;
  expectedArrival?: string;
  /** E5 */
  receiptConfirmed?: boolean;
  reviewLinks?: { label: string; url: string }[];
  /** E5: the review invitation (once per client). */
  inviteReview?: boolean;
  /** E5: the Trustpilot BCC goes out, so mention it. */
  trustpilotInvite?: boolean;
}

export interface PayoutEmailParts {
  template: PayoutTemplate;
  subject: string;
  preheader: string;
  blocks: PayoutEmailBlock[];
}

const p = (text: string): PayoutEmailBlock => ({ kind: 'p', text });
const btn = (label: string, url: string): PayoutEmailBlock => ({
  kind: 'button',
  label,
  url,
});

/** Fields a template cannot go without; missing ones open an admin task. */
export function requiredFields(
  template: PayoutTemplate
): Array<keyof PayoutEmailVars> {
  switch (template) {
    case 'E1A':
    case 'E1C':
    case 'E2A':
    case 'E2C':
      return ['amountReceived'];
    case 'E4A':
      return ['amountSent', 'transferDate'];
    case 'E4B':
      return ['finalAmount', 'onwardTransferDate', 'expectedArrival'];
    default:
      return [];
  }
}

export function missingFields(
  template: PayoutTemplate,
  vars: PayoutEmailVars
): string[] {
  return requiredFields(template).filter((k) => {
    const v = vars[k];
    return v === undefined || v === null || v === '';
  });
}

export function payoutEmail(
  template: PayoutTemplate,
  v: PayoutEmailVars
): PayoutEmailParts {
  const f = PRODUCT_FIELDS[v.product];
  const hi = p(`Hi ${v.firstName},`);
  const deadlineSentence = (prefix: string) =>
    v.reviewDeadline
      ? `${prefix} by ${v.reviewDeadline}.`
      : 'Please review the decision as soon as possible and contact us if you need help.';

  switch (template) {
    case 'E1A':
      return {
        template,
        subject: `Your ${f.paymentDescription} has arrived — review and authorise your payout`,
        preheader: 'Review the decision and authorise your payout online.',
        blocks: [
          hi,
          p(
            `Good news — your ${f.paymentDescription} of ${v.amountReceived} has arrived in our partner law firm’s escrow account. Your ${f.decisionDescription} is now available in your account.`
          ),
          p(
            `${deadlineSentence('Please review the decision')} ${f.reviewGuidance}`
          ),
          p(
            'You can also check the fee breakdown, confirm your bank details and sign the payment instruction online.'
          ),
          btn(f.combinedButton, v.links.review),
          p(
            'Our agreed service fee is deducted from your payout, so there is nothing to pay separately. Once you have signed the payment instruction, the law firm can arrange your transfer. We’ll email you again when it has been sent.'
          ),
          p(
            'If you have any questions or need help understanding the decision, just reply to this email.'
          ),
        ],
      };
    case 'E1B':
      return {
        template,
        subject: `Your ${f.reviewDocument} is ready to review`,
        preheader: `Your ${f.decisionDescription} is now available in your account.`,
        blocks: [
          hi,
          p(`Your ${f.decisionDescription} is now available in your account.`),
          p(
            `${v.reviewDeadline ? `Please review it by ${v.reviewDeadline}.` : 'Please review it as soon as possible and contact us if you need help.'} ${f.reviewGuidance} You can confirm the details or report an issue in your account.`
          ),
          btn(f.reviewButton, v.links.review),
          p(
            'We have not yet confirmed receipt of your payout in our partner law firm’s escrow account. You can complete your decision review now, and we’ll email you separately when the funds have arrived and your payout is ready to authorise.'
          ),
          p(
            'If you need help understanding the decision, just reply to this email.'
          ),
        ],
      };
    case 'E1C':
      return {
        template,
        subject: `Your ${f.paymentDescription} has arrived — please authorise your payout`,
        preheader: 'Sign your payment instruction online.',
        blocks: [
          hi,
          p(
            `Good news — your ${f.paymentDescription} of ${v.amountReceived} has now arrived in our partner law firm’s escrow account.`
          ),
          p(
            `Thank you for reviewing your ${f.reviewDocument}. The next step is to authorise your payout.`
          ),
          p(
            'Please sign in to check the fee breakdown, confirm your bank details and sign the payment instruction online.'
          ),
          btn('Authorise my payout', v.links.payout),
          p(
            'Our agreed service fee is deducted from your payout, so there is nothing to pay separately. Once you have signed, the law firm can arrange your transfer. We’ll email you again when it has been sent.'
          ),
          p(
            'If you have any questions or need help, just reply to this email.'
          ),
        ],
      };
    case 'E2A':
      return {
        template,
        subject: `Reminder: please review your ${f.reviewDocument} and authorise your payout`,
        preheader: 'We’re waiting for your authorisation.',
        blocks: [
          hi,
          p(
            `Your ${f.paymentDescription} of ${v.amountReceived} has arrived in our partner law firm’s escrow account. We’re waiting for your authorisation before the law firm can arrange your transfer.`
          ),
          p(
            `Please sign in to review your ${f.reviewDocument}, check the fee breakdown, confirm your bank details and sign the payment instruction.`
          ),
          p(deadlineSentence('Please review the decision')),
          btn(f.combinedButton, v.links.review),
          p(
            'If anything is unclear or you need help completing these steps, just reply to this email.'
          ),
        ],
      };
    case 'E2B':
      return {
        template,
        subject: `Reminder: please review your ${f.reviewDocument}`,
        preheader: 'We’re still waiting for your review.',
        blocks: [
          hi,
          p(
            `Your ${f.reviewDocument} is available in your account, and we’re still waiting for your review.`
          ),
          p(
            `Please review it by ${v.reviewDeadline}. ${f.reviewGuidance} You can confirm the details or report an issue in your account.`
          ),
          btn(f.reviewButton, v.links.review),
          p(
            'If you need help understanding the decision, just reply to this email.'
          ),
        ],
      };
    case 'E2C':
      return {
        template,
        // CompanyPension: avoid "payout payout".
        subject:
          v.product === 'bav'
            ? 'Reminder: please authorise your company pension payout'
            : `Reminder: please authorise your ${f.paymentDescription} payout`,
        preheader: 'We still need your signed payment instruction.',
        blocks: [
          hi,
          p(
            `Your ${f.paymentDescription} of ${v.amountReceived} is in our partner law firm’s escrow account. Thank you for reviewing your ${f.reviewDocument}.`
          ),
          p(
            'We still need your signed payment instruction before the law firm can arrange your transfer. Please sign in to check the fee breakdown, confirm your bank details and authorise the payout.'
          ),
          btn('Authorise my payout', v.links.payout),
          p(
            'If you need help or are unable to complete this step at the moment, just reply to this email so we can help.'
          ),
        ],
      };
    case 'EM':
      return {
        template,
        subject: `Have you received your ${f.reviewDocument}?`,
        preheader: `We’re still waiting for a copy of your ${f.reviewDocument}.`,
        blocks: [
          hi,
          p(
            `We’re still waiting for a copy of your ${f.reviewDocument}. It may have been sent directly to you.`
          ),
          p(
            'If you have received it, please sign in and upload a clear scan or photo of every page. If it has not arrived, you can let us know in the same place.'
          ),
          btn(
            'Upload my letter or tell you it has not arrived',
            v.links.decisionUpload
          ),
          p(
            'Once we have checked the document, we’ll make it available in your account and let you know the next step.'
          ),
          p(
            'If you are unsure which letter we need, just reply to this email and we’ll help.'
          ),
        ],
      };
    case 'E3':
      return {
        template,
        subject: 'Payout authorised — your transfer is being arranged',
        preheader: 'Your transfer has been added to the payout queue.',
        blocks: [
          hi,
          p(
            'Thank you for authorising your payout. We’ve received your signed payment instruction, and your transfer has been added to the payout queue.'
          ),
          p(
            'Our partner law firm makes transfers daily, but its bank limits the total amount that can be transferred each day. Depending on the amount of payouts awaiting transfer, it can take 3–7 days for your payment to be sent.'
          ),
          p(
            `${v.hasManager === false ? 'We’re' : 'I’m'} sorry for the additional wait, and thank you for your patience. You don’t need to do anything further at this stage.`
          ),
          p(
            'We’ll email you again once your transfer has been made. The time it takes to reach your account will depend on your chosen payment route and receiving bank.'
          ),
          p('If you have any questions, just reply to this email.'),
        ],
      };
    case 'E4A': {
      const facts = [
        `Amount sent: ${v.amountSent}`,
        `Transfer date: ${v.transferDate}`,
        ...(v.bankName ? [`Receiving bank: ${v.bankName}`] : []),
        ...(v.accountEnding ? [`Account ending: ${v.accountEnding}`] : []),
      ];
      return {
        template,
        subject: `Your ${f.paymentDescription} has been sent`,
        preheader: 'Our partner law firm has sent your payout.',
        blocks: [
          hi,
          p(
            'Good news — our partner law firm has sent your payout to the bank account you confirmed.'
          ),
          p(facts.join('\n')),
          p(
            'The payment is now on its way. When it appears in your account will depend on the receiving bank and any banks involved in processing the transfer.'
          ),
          p(
            'Please let us know once it arrives. If you have any questions about the payment, just reply to this email and we’ll help.'
          ),
          p(`Thank you for trusting us with your ${f.paymentDescription}.`),
        ],
      };
    }
    case 'E4B':
      return {
        template,
        subject: `Your ${f.paymentDescription} has been sent — transfer receipt attached`,
        preheader: 'Your payout has been converted and sent.',
        blocks: [
          hi,
          p(
            'Good news — your payout has now been converted and sent to your bank account. SummitFX arranged the currency conversion and payment through TransferMate.'
          ),
          p(
            [
              `Amount sent: ${v.finalAmount}`,
              `Transfer date: ${v.onwardTransferDate}`,
              `Expected arrival: ${v.expectedArrival}`,
            ].join('\n')
          ),
          p(
            'Your transfer receipt is attached and contains the payment details for your records. You can also find it in your account.'
          ),
          p(
            'The expected arrival date is an estimate; your receiving bank’s processing may affect when the funds appear in your account.'
          ),
          p(
            'Please let us know once the money arrives. If it has not arrived by the expected date, or you have any questions, just reply to this email and we’ll check it for you.'
          ),
          p(`Thank you for trusting us with your ${f.paymentDescription}.`),
        ],
      };
    case 'E5': {
      const review: PayoutEmailBlock[] =
        v.inviteReview && v.reviewLinks?.length
          ? [
              p(
                'We would also appreciate a short review of your experience. Your feedback helps other people decide whether our service is right for them.'
              ),
              ...v.reviewLinks.map((l) => btn(l.label, l.url)),
            ]
          : [];
      const trustpilot: PayoutEmailBlock[] =
        v.inviteReview && v.trustpilotInvite
          ? [
              p(
                'You may also receive a separate review invitation from Trustpilot. This comes directly from Trustpilot and gives you another way to share your experience.'
              ),
            ]
          : [];
      if (v.receiptConfirmed) {
        return {
          template,
          subject: `Thank you for trusting ${f.brand}`,
          preheader: `Thank you for confirming that your ${f.paymentDescription} has arrived.`,
          blocks: [
            hi,
            p(
              `Thank you for confirming that your ${f.paymentDescription} has arrived.`
            ),
            ...review,
            ...trustpilot,
            p('Thank you again for your trust.'),
          ],
        };
      }
      return {
        template,
        subject: `Has your ${f.paymentDescription} arrived?`,
        preheader: 'Please let us know whether it has arrived.',
        blocks: [
          hi,
          p(
            `Your ${f.paymentDescription} should now have reached your bank account. Please let us know whether it has arrived so we can update your case.`
          ),
          btn('Confirm receipt or report a missing payment', v.links.receipt),
          p(
            'If the money has not arrived, please tell us through your account or reply to this email, and we’ll check it for you.'
          ),
          ...review,
          ...trustpilot,
          p('Thank you again for your trust.'),
        ],
      };
    }
  }
}
