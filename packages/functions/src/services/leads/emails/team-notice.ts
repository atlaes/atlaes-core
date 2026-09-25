/**
 * Team notices (NOTIFY_EMAIL in the Apps Script), plain text, verbatim.
 */
import type { GuideKey } from '../config';
import { GUIDE_COPY } from './guides';

export interface GuideTeamNoticeInput {
  guide: GuideKey;
  email: string;
  reminderOptIn: boolean;
  /** 'YYYY-MM' or null; printed as M/YYYY like the script's exitMonth/exitYear. */
  lastContributionMonth: string | null;
  widget: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export function renderGuideTeamNotice(input: GuideTeamNoticeInput): {
  subject: string;
  text: string;
} {
  const g = GUIDE_COPY[input.guide];
  const [year, month] = input.lastContributionMonth
    ? input.lastContributionMonth.split('-')
    : ['', ''];
  const exitMonth = month ? String(Number(month)) : '';
  const exitYear = year || '';
  return {
    subject:
      g.teamSubject + (input.reminderOptIn ? ' (+ Wartefrist-Erinnerung)' : ''),
    text:
      'E-Mail:    ' +
      input.email +
      '\n' +
      (input.reminderOptIn
        ? 'Erinnerung: JA — letzter Pflichtbeitrag ' +
          (exitMonth || '?') +
          '/' +
          (exitYear || '?') +
          '\n'
        : '') +
      'Widget:    ' +
      input.widget +
      '\n' +
      (input.referrer ? 'Seite:     ' + input.referrer + '\n' : '') +
      (input.utmSource
        ? 'Quelle:    ' +
          input.utmSource +
          ' / ' +
          (input.utmMedium || '') +
          ' / ' +
          (input.utmCampaign || '') +
          '\n'
        : ''),
  };
}

export interface ClaimLeadTeamNoticeInput {
  firstName: string;
  lastName: string;
  email: string;
  verdict: string;
  verdictTitle: string;
  citizenship: string;
  residence: string;
  canApplyFrom: string | null;
  estimateEur: number | null;
  incomeEntered: string | null;
  widget: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  submittedAt: string;
}

/** "New widget lead" notice from doPost() in the Apps Script. */
export function renderClaimLeadTeamNotice(input: ClaimLeadTeamNoticeInput): {
  subject: string;
  text: string;
} {
  const isWaiting = input.verdict === 'warn';
  const subject =
    'New widget lead' +
    (isWaiting ? ' (waiting — file ' + input.canApplyFrom + ')' : '') +
    ' — ' +
    input.firstName +
    ' ' +
    input.lastName;
  const text =
    'Name:          ' +
    input.firstName +
    ' ' +
    input.lastName +
    '\n' +
    'Email:         ' +
    input.email +
    '\n' +
    'Verdict:       ' +
    input.verdict +
    ' — ' +
    input.verdictTitle +
    '\n' +
    'Citizenship:   ' +
    input.citizenship +
    '\n' +
    'Residence:     ' +
    input.residence +
    '\n' +
    (input.canApplyFrom ? 'Can apply from: ' + input.canApplyFrom + '\n' : '') +
    (input.estimateEur
      ? 'Estimate:      EUR ' +
        input.estimateEur +
        ' (income entered: ' +
        input.incomeEntered +
        ')\n'
      : '') +
    'Widget:        ' +
    input.widget +
    '\n' +
    (input.referrer ? 'Page:          ' + input.referrer + '\n' : '') +
    (input.utmSource
      ? 'Source:        ' +
        input.utmSource +
        ' / ' +
        (input.utmMedium || '') +
        ' / ' +
        (input.utmCampaign || '') +
        '\n'
      : '') +
    'Submitted:     ' +
    input.submittedAt +
    '\n';
  return { subject, text };
}
