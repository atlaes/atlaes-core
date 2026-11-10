import apiClient from './api';

// Client for /api/admin/eligibility-leads — records from the GPR
// eligibility check (/check/3-step): free-review requests, filing-date
// reminders and the check a visitor attested to at sign-up.

export type EligibilityLeadKind = 'review' | 'reminder' | 'signup';
export type EligibilityLeadStatus = 'open' | 'replied' | 'closed';

export interface EligibilityAnswers {
  citizenship?: string;
  secondCitizenship?: string | null;
  residence?: string;
  lastContributionMonth?: string;
  localPension?: string | null;
  localPensionEndMonth?: string | null;
  effectiveLastMonth?: string;
  germanMonths?: string | null;
  [key: string]: unknown;
}

export interface EligibilityLead {
  id: string;
  type: string;
  createdAt: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  message: string | null;
  ruleSet: string | null;
  result: string | null;
  blockReason: string | null;
  answers: EligibilityAnswers | null;
  fileFrom: string | null;
  reminderDueOn: string | null;
  reminderSentAt: string | null;
  attestedAt: string | null;
  status: string | null;
  repliedAt: string | null;
  teamNoticeSentAt: string | null;
  referrer: string | null;
  landingPage: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  fbclid: string | null;
  via: string | null;
}

export const BLOCK_REASON_LABELS: Record<string, string> = {
  citizenship: 'Citizenship',
  'residence-eu-uk': 'Residence in the EU or the UK',
  'residence-india': 'Residence in India',
  'residence-israel': 'Residence in Israel',
  'residence-exyu': 'Residence in a former Yugoslav state',
  'local-insurance': 'Local pension insurance',
  'sixty-months': '60+ German contribution months',
};

export const RESULT_LABELS: Record<string, string> = {
  PROCEED: 'Can file now',
  PROCEED_FROM_DATE: 'Can file from a date',
  NOT_NOW: 'Not now',
};

export const ANSWER_LABELS: Record<string, string> = {
  citizenship: 'Citizenship',
  secondCitizenship: 'Second citizenship',
  residence: 'Residence',
  lastContributionMonth: 'Last German contribution',
  localPension: 'Local pension insurance',
  localPensionEndMonth: 'Local insurance ended',
  effectiveLastMonth: 'Effective last month',
  germanMonths: 'German contribution months',
};

export const ANSWER_VALUE_LABELS: Record<string, Record<string, string>> = {
  localPension: {
    no: 'No',
    'yes-currently': 'Yes, currently',
    'not-any-more': 'Not any more',
  },
  germanMonths: { lt60: 'Fewer than 60', '60plus': '60 or more' },
};

export async function getEligibilityLeads(
  type: EligibilityLeadKind
): Promise<EligibilityLead[]> {
  const { data } = await apiClient.get('/admin/eligibility-leads', {
    params: { type },
  });
  return data.leads;
}

export async function setEligibilityLeadStatus(
  id: string,
  status: EligibilityLeadStatus
): Promise<EligibilityLead> {
  const { data } = await apiClient.post(
    `/admin/eligibility-leads/${id}/status`,
    { status }
  );
  return data.lead;
}
