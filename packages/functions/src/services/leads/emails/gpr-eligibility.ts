/**
 * GPR eligibility check mails (services/leads/gpr-eligibility.ts):
 *   - the filing-date reminder for "Remind me, no account yet" (English,
 *     GPR-branded, same plain layout as the widget welcome mail);
 *   - the team notice for a "free review" request (plain text).
 *
 * The reminder must not claim eligibility: the check is the visitor's own
 * answers, the file date is when an application can first be filed.
 */
import type { Lead } from '../../../drizzle/schema/leads';
import type { RenderedEmail } from './delivery';
import { escHtml } from './welcome';

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** 'YYYY-MM-DD' (or 'YYYY-MM') → 'April 2027'. */
export function formatFileFromLabel(fileFrom: string): string {
  const [y, m] = fileFrom.split('-').map(Number);
  return `${MONTHS_EN[m - 1]} ${y}`;
}

export interface EligibilityReminderInput {
  firstName: string | null;
  /** 'April 2027' — see formatFileFromLabel(). */
  fileFromLabel: string;
  checkUrl: string;
  siteUrl: string;
  senderName: string;
}

export function renderEligibilityReminderEmail(
  input: EligibilityReminderInput
): RenderedEmail {
  const P = '<p style="margin:0 0 14px">';
  const greeting = input.firstName ? `Hi ${input.firstName},` : 'Hello,';
  const subject = `Your German pension refund can be filed from ${input.fileFromLabel}`;

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#202124;max-width:640px">' +
    P +
    escHtml(greeting) +
    '</p>' +
    P +
    'You asked us to write to you about two months before <b>' +
    escHtml(input.fileFromLabel) +
    '</b>, the first date a refund application can be filed for you.</p>' +
    P +
    'If nothing has changed since your check (no new German contributions and no new contributions to a pension scheme in your country), ' +
    'create your account now and we prepare everything, so your application is filed on that date.</p>' +
    '<p style="margin:0 0 20px">' +
    '<a href="' +
    escHtml(input.checkUrl) +
    '" style="display:inline-block;background:#002691;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:6px">Create your account</a>' +
    '</p>' +
    P +
    'If something has changed, run the check again with your current details at the same link.</p>' +
    P +
    'Kind regards,<br>' +
    escHtml(input.senderName) +
    '</p>' +
    '<p style="margin:20px 0 0;font-size:12px;color:#5f6368">' +
    'You receive this e-mail because you asked for a reminder on ' +
    '<a href="' +
    escHtml(input.siteUrl) +
    '" style="color:#5f6368">GermanyPensionRefund.com</a>. ' +
    'It is the only reminder we send.</p>' +
    '</div>';

  const text =
    greeting +
    '\n\n' +
    'You asked us to write to you about two months before ' +
    input.fileFromLabel +
    ', the first date a refund application can be filed for you.\n\n' +
    'If nothing has changed since your check (no new German contributions and no new contributions to a pension scheme in your country), ' +
    'create your account now and we prepare everything, so your application is filed on that date.\n\n' +
    'Create your account: ' +
    input.checkUrl +
    '\n\n' +
    'If something has changed, run the check again with your current details at the same link.\n\n' +
    'Kind regards,\n' +
    input.senderName +
    '\n\n' +
    '--\nYou receive this e-mail because you asked for a reminder on ' +
    input.siteUrl +
    '. It is the only reminder we send.';

  return { subject, html, text };
}

/** Readable labels for the rule set's block_reason codes. */
export const ELIGIBILITY_BLOCK_REASON_LABELS: Record<string, string> = {
  citizenship: 'Citizenship',
  'residence-eu-uk': 'Residence in the EU or the UK',
  'residence-india': 'Residence in India',
  'residence-israel': 'Residence in Israel',
  'residence-exyu': 'Residence in a former Yugoslav state',
  'local-insurance': 'Local pension insurance',
  'sixty-months': '60+ German contribution months',
};

const line = (label: string, value: unknown) =>
  value === null || value === undefined || value === ''
    ? ''
    : `${(label + ':').padEnd(22)}${String(value)}\n`;

/** "Free review" request notice for the team (LEADS_NOTIFY_EMAIL). */
export function renderEligibilityReviewTeamNotice(lead: Lead): {
  subject: string;
  text: string;
} {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
  const reason = lead.blockReason
    ? (ELIGIBILITY_BLOCK_REASON_LABELS[lead.blockReason] ?? lead.blockReason)
    : null;
  const subject =
    'Free review request — ' +
    (name || lead.email) +
    (reason ? ` (${reason})` : '');

  const answers = (lead.answers ?? {}) as Record<string, unknown>;
  const answerLines = Object.entries(answers)
    .map(([k, v]) => line(`  ${k}`, v === null ? '—' : v))
    .join('');

  const text =
    line('Name', name) +
    line('Email', lead.email) +
    line(
      'Block reason',
      lead.blockReason ? `${lead.blockReason} — ${reason}` : null
    ) +
    line('Result', lead.result) +
    line('Rule set', lead.ruleSet) +
    line('File from', lead.fileFrom) +
    '\nAnswers:\n' +
    (answerLines || '  (none)\n') +
    (lead.message ? '\nMessage:\n' + lead.message + '\n' : '') +
    '\n' +
    line('Widget', lead.widget) +
    line('Via', lead.via) +
    line('Page', lead.referrer) +
    line('Landing page', lead.landingPage) +
    line(
      'Source',
      lead.utmSource
        ? [lead.utmSource, lead.utmMedium, lead.utmCampaign]
            .map((v) => v ?? '')
            .join(' / ')
        : null
    ) +
    line('UTM term', lead.utmTerm) +
    line('UTM content', lead.utmContent) +
    line('gclid', lead.gclid) +
    line('fbclid', lead.fbclid) +
    line('Submitted', (lead.submittedAt ?? lead.createdAt).toISOString());

  return { subject, text };
}
