/**
 * Trigger → template map and rendering (Rules for Karl, "Triggers →
 * template" and "Drafts and sending"). Pure: no clock, no database.
 */

import type {
  ClientUpdateTemplate,
  ContactChannel,
  ContactType,
  InfoRequestSource,
  M4StatusParagraph,
} from '../../drizzle/schema/client-updates';
import {
  ADDITIONAL_INFORMATION_FROM_FILE,
  ADDITIONAL_INFORMATION_NEEDS_CUSTOMER,
  BUTTON_TOKEN,
  CLOSING,
  CUSTOMER_ACTION_SENTENCE,
  M3_ONWARD_ASKED,
  M3_ONWARD_CONFIRMED,
  M4_STATUS_PARAGRAPH_TEXT,
  M5_NO_REPLY,
  M6A_NO_RESPONSE,
  M6_ONWARD_NO_NEWS,
  NOTHING_NEEDED_SENTENCE,
  NOTHING_NEEDED_VARIANTS,
  OB_BLOCK_B,
  OB_BLOCK_B_AUSTRALIA,
  TEMPLATES,
  type EmailTemplate,
} from './emails/templates';
import { isFortnightlyPhase, type IsoDate } from './schedule';

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface ScheduledSelectionInput {
  submissionDate: IsoDate;
  today: IsoDate;
  /** Scheduled (no-event) updates already sent after M0. */
  scheduledUpdatesSent: number;
}

/**
 * Scheduled date due, no event: M1 (first) · M2 (second) · M3 onward
 * no-news · M6 onward fortnightly (after + 6 months).
 */
export function selectScheduledTemplate(
  input: ScheduledSelectionInput
): ClientUpdateTemplate {
  if (isFortnightlyPhase(input.submissionDate, input.today)) return 'M6_ONWARD';
  if (input.scheduledUpdatesSent <= 0) return 'M1';
  if (input.scheduledUpdatesSent === 1) return 'M2';
  return 'M3_ONWARD';
}

export interface ContactSelectionInput {
  type: ContactType;
  channel: ContactChannel;
  updateWarranted: boolean;
  infoRequestSource?: InfoRequestSource | null;
  /** For the senior review outcome without a complaint (M6B). */
  seniorReviewWithoutComplaint?: boolean;
}

/**
 * Contact logged with updateWarranted → template. `null` = no e-mail
 * (unsuccessful_attempt is logged only; nothing changes).
 */
export function selectContactTemplate(
  input: ContactSelectionInput
): ClientUpdateTemplate | null {
  if (input.type === 'unsuccessful_attempt') return null;
  if (!input.updateWarranted) return null;
  switch (input.type) {
    case 'status_enquiry':
      return input.channel === 'phone' ? 'M3A' : 'M3B';
    case 'office_reply':
      return 'M4';
    case 'written_reminder':
      return 'M5';
    case 'complaint':
      return 'M6A';
    case 'transfer':
      return 'E1';
    case 'info_request':
      if (input.infoRequestSource === 'originals_oldenburg')
        return 'OB_ORIGINALS';
      return input.infoRequestSource === 'file' ? 'E2B' : 'E2A';
    case 'documents_forwarded':
      return 'E3';
    default:
      return null;
  }
}

/** Senior review at + 6 months without a complaint → M6B. */
export function selectSeniorReviewTemplate(input: {
  complaintFiled: boolean;
}): ClientUpdateTemplate {
  return input.complaintFiled ? 'M6A' : 'M6B';
}

/** Whether an event e-mail replaces the pending scheduled draft. */
export function eventReplacesScheduledDraft(
  template: ClientUpdateTemplate
): boolean {
  // Every event mail except E3 states the next date and carries a
  // substantive update; E3 preserves the existing promised date (it is a
  // routine acknowledgement unless the admin sets a new date explicitly).
  return template !== 'E3';
}

/** Event e-mails that are routine acknowledgements by default. */
export function isRoutineAcknowledgement(
  template: ClientUpdateTemplate
): boolean {
  return template === 'E3';
}

/** Whether the sequence is closed by this event. */
export function stopsSequence(event: 'decision' | 'funds'): boolean {
  return event === 'decision' || event === 'funds';
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Human labels for unresolved tokens, so a draft shows `[first name]`. */
export const PLACEHOLDER_LABELS: Record<string, string> = {
  firstName: 'first name',
  pensionOffice: 'pension office',
  submissionDate: 'submission date',
  date: 'date',
  customerUpdateDate: 'customer update date',
  followUpDate: 'follow-up date',
  actionDate: 'action date',
  contactDate: 'contact date',
  nextAction: 'next action',
  specificNextAction: 'specific next action',
  reviewerName: 'reviewer name',
  reviewerRole: 'head of customer service / managing director',
  sentDate: 'sent date',
  requestedReplyDate: 'requested reply date',
  oldOffice: 'old office',
  newOffice: 'new office',
  plainEnglishReason: 'plain English reason',
  documentOrDetail: 'document or detail',
  reason: 'reason',
  item: 'item',
  customerActionDate: 'customer action date',
  documents: 'documents',
  dates: 'dates',
  estimatedDate: 'estimated date',
  question: 'question',
  status: 'status',
  caseManagerSignature: 'case manager signature',
  explanation:
    'Explain what the office confirmed and what it means for this application in one or two plain English sentences.',
  replySummary: 'Explain any reply already received.',
  responseSummary: 'Summarise the response.',
  reviewOutcome:
    'Explain the known reason for the delay, or say it is still unclear. Explain the agreed next step and who will take it by what date.',
  latestDevelopment: 'Brief latest development.',
  requestedItems:
    'Exactly what the customer needs to send, including which period or pages if relevant.',
  lastContactParagraph:
    'At our last contact on [date], the office confirmed [status]. / We asked the office [question] on [date] and are still waiting for a clear answer.',
  statusParagraph: 'Insert the matching status paragraph.',
  officeDeadline: "deadline in the office's letter",
  waitLength: 'actual wait',
  processingTimesLink: 'See our processing times',
};

export type TemplateVariables = Record<string, string | null | undefined>;

export interface RenderInput {
  template: ClientUpdateTemplate;
  variables: TemplateVariables;
  /** Link target for the `[Button: …]` line. */
  accountUrl: string;
  /** An open customer task removes every "nothing needed" sentence. */
  customerTaskOpen: boolean;
  /** M4 only. */
  statusParagraph?: M4StatusParagraph | null;
  /** M3 onward only: which middle paragraph. */
  lastContactKind?: 'confirmed' | 'asked' | null;
  /** OB_ORIGINALS only. */
  includeBlockB?: boolean;
}

export interface RenderedEmail {
  template: ClientUpdateTemplate;
  subject: string;
  /** Plain-text body including the closing. */
  body: string;
  paragraphs: string[];
  button: { label: string; url: string };
  unresolved: string[];
}

const TOKEN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/** Slots that may legitimately render as nothing (Block B left out). */
const OPTIONAL_TOKENS = new Set(['blockB']);

function substitute(
  text: string,
  vars: TemplateVariables,
  unresolved: Set<string>
): string {
  return text.replace(TOKEN, (_m, name: string) => {
    const value = vars[name];
    if (value === '' && OPTIONAL_TOKENS.has(name)) return '';
    if (value === undefined || value === null || value === '') {
      unresolved.add(name);
      return `[${PLACEHOLDER_LABELS[name] ?? name}]`;
    }
    return value;
  });
}

/** Resolve the case-driven alternatives into plain variables. */
export function resolveDerivedVariables(input: RenderInput): TemplateVariables {
  const v: TemplateVariables = { ...input.variables };

  // Customer action sentence (M3A, M4, M6 onward).
  if (!v.customerActionSentence) {
    v.customerActionSentence = input.customerTaskOpen
      ? CUSTOMER_ACTION_SENTENCE
      : NOTHING_NEEDED_SENTENCE;
  }

  if (input.template === 'M4') {
    const key = input.statusParagraph;
    if (key && M4_STATUS_PARAGRAPH_TEXT[key]) {
      v.statusParagraph = M4_STATUS_PARAGRAPH_TEXT[key];
    }
    if (!v.additionalInformationSentence) {
      v.additionalInformationSentence = input.customerTaskOpen
        ? ADDITIONAL_INFORMATION_NEEDS_CUSTOMER
        : ADDITIONAL_INFORMATION_FROM_FILE;
    }
  }

  if (input.template === 'M5' && !v.replySummary) v.replySummary = M5_NO_REPLY;
  if (input.template === 'M6A') {
    if (!v.responseSummary) v.responseSummary = M6A_NO_RESPONSE;
    if (!v.waitLength) v.waitLength = 'six months';
  }
  if (input.template === 'M6_ONWARD' && !v.latestDevelopment) {
    v.latestDevelopment = M6_ONWARD_NO_NEWS;
  }
  if (input.template === 'M3_ONWARD' && !v.lastContactParagraph) {
    if (input.lastContactKind === 'confirmed') {
      v.lastContactParagraph = M3_ONWARD_CONFIRMED;
    } else if (input.lastContactKind === 'asked') {
      v.lastContactParagraph = M3_ONWARD_ASKED;
    }
  }
  if (input.template === 'OB_ORIGINALS') {
    v.residencePensionName ??= OB_BLOCK_B_AUSTRALIA.residencePensionName;
    v.residencePensionAuthority ??=
      OB_BLOCK_B_AUSTRALIA.residencePensionAuthority;
    v.residencePensionAdjective ??=
      OB_BLOCK_B_AUSTRALIA.residencePensionAdjective;
    v.blockB = input.includeBlockB ? OB_BLOCK_B.join('\n\n') : '';
  }
  if (input.template === 'M0' && !v.processingTimesLink) {
    v.processingTimesLink =
      'See our processing times: https://www.germanypensionrefund.com/german-pension-refund-processing-time';
  }
  return v;
}

/**
 * Render a template. Substitution runs twice so a resolved alternative
 * (which may itself carry tokens) is filled from the same variables.
 */
export function renderTemplate(input: RenderInput): RenderedEmail {
  const template: EmailTemplate = TEMPLATES[input.template];
  const vars = resolveDerivedVariables(input);
  const unresolved = new Set<string>();
  const sub = (s: string) =>
    substitute(substitute(s, vars, unresolved), vars, unresolved);

  const button = { label: template.button, url: input.accountUrl };
  const paragraphs: string[] = [];
  for (const p of template.paragraphs) {
    if (p === BUTTON_TOKEN) {
      paragraphs.push(`${button.label}: ${button.url}`);
      continue;
    }
    const text = sub(p);
    if (text.trim() === '') continue; // e.g. Block B left out
    paragraphs.push(text);
  }
  paragraphs.push(sub(CLOSING));

  const subject = sub(template.subject);
  return {
    template: input.template,
    subject,
    body: paragraphs.join('\n\n'),
    paragraphs,
    button,
    unresolved: [...unresolved],
  };
}

// ---------------------------------------------------------------------------
// Pre-send checks ("Before send")
// ---------------------------------------------------------------------------

export interface SendCheckInput {
  subject: string;
  body: string;
  customerTaskOpen: boolean;
  /** Contact dates stated in the e-mail must exist in the log. */
  statedContactDates?: IsoDate[];
  loggedContactDates?: IsoDate[];
}

export interface SendCheckResult {
  ok: boolean;
  problems: string[];
}

const LEFTOVER_PLACEHOLDER = /\[[^\]\n]{1,120}\]/;

export function checkBeforeSend(input: SendCheckInput): SendCheckResult {
  const problems: string[] = [];
  const text = `${input.subject}\n${input.body}`;
  if (TOKEN.test(text) || LEFTOVER_PLACEHOLDER.test(text)) {
    problems.push('Unresolved placeholder in the draft');
  }
  TOKEN.lastIndex = 0;
  if (input.customerTaskOpen) {
    for (const s of NOTHING_NEEDED_VARIANTS) {
      if (text.toLowerCase().includes(s.toLowerCase())) {
        problems.push(`"${s}" while a customer task is open`);
        break;
      }
    }
  }
  if (input.statedContactDates?.length) {
    const logged = new Set(input.loggedContactDates ?? []);
    for (const d of input.statedContactDates) {
      if (!logged.has(d)) {
        problems.push(`Contact on ${d} stated without a log entry`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

/** Which variables a template needs (for the admin's draft form). */
export function templateVariables(template: ClientUpdateTemplate): string[] {
  const t = TEMPLATES[template];
  const names = new Set<string>();
  const collect = (s: string) => {
    for (const m of s.matchAll(TOKEN)) names.add(m[1]);
  };
  collect(t.subject);
  t.paragraphs.forEach(collect);
  collect(CLOSING);
  names.delete('button');
  return [...names];
}
