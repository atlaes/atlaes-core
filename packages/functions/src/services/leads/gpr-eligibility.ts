import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { leads, type Lead, type NewLead } from '../../drizzle/schema/leads';
import { leadsConfig } from './config';
import { sendLeadMail } from './emails/send';
import {
  formatFileFromLabel,
  renderEligibilityReminderEmail,
  renderEligibilityReviewTeamNotice,
} from './emails/gpr-eligibility';

/**
 * GPR eligibility check (/check/3-step, client rule set
 * GPR-ELIG-2026-11-10). The check runs in the browser; the backend only
 * keeps a lead row at three moments:
 *
 *   gpr-elig-reminder — "Remind me, no account yet" opt-in for a result
 *                       that can be filed from a later date. The daily
 *                       leads cron (processDueReminders) sends one
 *                       GPR-branded reminder two months before `file_from`.
 *   gpr-elig-review   — "Free review" request from a negative result; the
 *                       team gets a notice, the row starts as status 'open'.
 *   gpr-elig-signup   — account creation from the funnel (magic-link
 *                       request with `eligibilityCheck`); the answers the
 *                       visitor attested to, no mails.
 *
 * Like 'vbl-reminder', deliberately NOT in LEAD_TYPES: createLead() would
 * send the generic GPR welcome mail and team notice.
 */
export const GPR_ELIG_REMINDER_TYPE = 'gpr-elig-reminder';
export const GPR_ELIG_REVIEW_TYPE = 'gpr-elig-review';
export const GPR_ELIG_SIGNUP_TYPE = 'gpr-elig-signup';
export const GPR_ELIG_WIDGET = 'GPR-ELIGIBILITY';

export const GPR_ELIG_LEAD_TYPES = {
  review: GPR_ELIG_REVIEW_TYPE,
  reminder: GPR_ELIG_REMINDER_TYPE,
  signup: GPR_ELIG_SIGNUP_TYPE,
} as const;
export type GprEligLeadKind = keyof typeof GPR_ELIG_LEAD_TYPES;

export const GPR_ELIG_RESULTS = [
  'PROCEED',
  'PROCEED_FROM_DATE',
  'NOT_NOW',
] as const;

export const GPR_ELIG_REVIEW_STATUSES = ['open', 'replied', 'closed'] as const;
export type GprEligReviewStatus = (typeof GPR_ELIG_REVIEW_STATUSES)[number];

// ------------------------------------------------------------------ schemas

const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

const countryCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'ISO 3166-1 alpha-2 code')
  .transform((v) => v.toUpperCase());

const yearMonth = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM');

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .refine((v) => {
    const t = Date.parse(`${v}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
  }, 'Invalid date');

export const eligibilityAnswersSchema = z.object({
  citizenship: countryCode,
  secondCitizenship: countryCode.optional().nullable(),
  residence: countryCode,
  // Null when the check stopped before the question (e.g. a citizenship
  // or residence block); a reminder always has them (it needs fileFrom).
  lastContributionMonth: yearMonth.optional().nullable(),
  localPension: z
    .enum(['no', 'yes-currently', 'not-any-more'])
    .optional()
    .nullable(),
  localPensionEndMonth: yearMonth.optional().nullable(),
  effectiveLastMonth: yearMonth.optional().nullable(),
  germanMonths: z.enum(['lt60', '60plus']).optional().nullable(),
});
export type EligibilityAnswers = z.infer<typeof eligibilityAnswersSchema>;

/** Same limits as the public /api/leads payload (routes/leads.ts). */
export const attributionSchema = {
  referrer: optStr(2000),
  landingPage: optStr(2000),
  utmSource: optStr(255),
  utmMedium: optStr(255),
  utmCampaign: optStr(255),
  utmTerm: optStr(255),
  utmContent: optStr(255),
  gclid: optStr(255),
  fbclid: optStr(255),
  via: optStr(100),
};

/** What the browser evaluated: shared by all three lead types. */
const checkFields = {
  ruleSet: z.string().trim().min(1).max(40),
  result: z.enum(GPR_ELIG_RESULTS),
  blockReason: optStr(40),
  answers: eligibilityAnswersSchema,
  fileFrom: isoDate.optional().nullable(),
  ...attributionSchema,
};

/** POST /api/eligibility-leads body. */
export const eligibilityLeadPayloadSchema = z
  .object({
    kind: z.enum(['reminder', 'review']),
    email: z.string().trim().toLowerCase().email().max(255),
    firstName: optStr(100),
    lastName: optStr(100),
    message: optStr(500),
    reminderOptIn: z.boolean().optional(),
    hp: optStr(500),
    submittedAt: optStr(40),
    ...checkFields,
  })
  .superRefine((p, ctx) => {
    if (p.kind === 'reminder') {
      if (p.reminderOptIn !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reminderOptIn'],
          message: 'A reminder needs the explicit opt-in',
        });
      }
      if (!p.fileFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fileFrom'],
          message: 'A reminder needs the filing date',
        });
      } else {
        const t = Date.parse(`${p.fileFrom}T00:00:00Z`);
        const now = Date.now();
        if (
          t < now - 24 * 3600 * 1000 ||
          t > now + 10 * 365 * 24 * 3600 * 1000
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['fileFrom'],
            message: 'The filing date must be in the future',
          });
        }
      }
    } else {
      if (!p.firstName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['firstName'],
          message: 'Required',
        });
      }
      if (!p.lastName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lastName'],
          message: 'Required',
        });
      }
    }
  });
export type EligibilityLeadPayload = z.infer<
  typeof eligibilityLeadPayloadSchema
>;

/** `eligibilityCheck` on POST /api/auth/magic-link/request. */
export const eligibilityCheckSchema = z.object({
  ...checkFields,
  attestedAt: z
    .string()
    .trim()
    .max(40)
    .refine((v) => !Number.isNaN(Date.parse(v)), 'ISO timestamp'),
});
export type EligibilityCheck = z.infer<typeof eligibilityCheckSchema>;

// ---------------------------------------------------------------- date math

/**
 * Reminder day: the 1st of the month two months before the filing date
 * (file_from 2027-04-01 → 2027-02-01; 2027-01-15 → 2026-11-01).
 */
export function eligibilityReminderDueOn(fileFrom: string): string {
  const [y, m] = fileFrom.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 - 2, 1)).toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ storage

export interface EligibilityLeadMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

type CheckInput = Pick<
  EligibilityCheck,
  | 'ruleSet'
  | 'result'
  | 'blockReason'
  | 'answers'
  | 'fileFrom'
  | keyof typeof attributionSchema
>;

function parseClientTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Columns every gpr-elig-* row carries. */
function baseRow(
  type: string,
  email: string,
  check: CheckInput,
  meta: EligibilityLeadMeta
): NewLead {
  return {
    type,
    email: email.trim().toLowerCase(),
    widget: GPR_ELIG_WIDGET,
    ruleSet: check.ruleSet,
    result: check.result,
    blockReason: check.blockReason ?? null,
    answers: check.answers,
    fileFrom: check.fileFrom ?? null,
    canApplyFrom: check.fileFrom ?? null,
    citizenship: check.answers.citizenship,
    residence: check.answers.residence,
    lastContributionMonth: check.answers.effectiveLastMonth ?? null,
    via: check.via ?? null,
    referrer: check.referrer ?? null,
    landingPage: check.landingPage ?? null,
    utmSource: check.utmSource ?? null,
    utmMedium: check.utmMedium ?? null,
    utmCampaign: check.utmCampaign ?? null,
    utmTerm: check.utmTerm ?? null,
    utmContent: check.utmContent ?? null,
    gclid: check.gclid ?? null,
    fbclid: check.fbclid ?? null,
    source: 'api',
    ipAddress: meta.ipAddress?.trim() || null,
    userAgent: meta.userAgent ? meta.userAgent.slice(0, 500) : null,
  };
}

/**
 * "Remind me, no account yet". Idempotent per e-mail + filing date while
 * the reminder is unsent. No mail now: the page shows the confirmation.
 */
export async function createEligibilityReminder(
  p: EligibilityLeadPayload,
  meta: EligibilityLeadMeta = {}
): Promise<Lead> {
  const fileFrom = p.fileFrom;
  if (!fileFrom) throw new Error('fileFrom is required for a reminder');
  const email = p.email.trim().toLowerCase();

  const [existing] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.type, GPR_ELIG_REMINDER_TYPE),
        eq(leads.email, email),
        eq(leads.fileFrom, fileFrom),
        isNull(leads.reminderSentAt)
      )
    )
    .limit(1);
  if (existing) return existing;

  const [lead] = await db
    .insert(leads)
    .values({
      ...baseRow(GPR_ELIG_REMINDER_TYPE, email, p, meta),
      firstName: p.firstName,
      lastName: p.lastName,
      reminderOptIn: true,
      reminderDueOn: eligibilityReminderDueOn(fileFrom),
      submittedAt: parseClientTimestamp(p.submittedAt),
    })
    .returning();
  logger.info('GPR eligibility reminder stored', {
    id: lead.id,
    fileFrom,
    dueOn: lead.reminderDueOn,
  });
  return lead;
}

/** "Free review" request from a negative result: row + team notice. */
export async function createEligibilityReview(
  p: EligibilityLeadPayload,
  meta: EligibilityLeadMeta = {}
): Promise<Lead> {
  const [lead] = await db
    .insert(leads)
    .values({
      ...baseRow(GPR_ELIG_REVIEW_TYPE, p.email, p, meta),
      firstName: p.firstName,
      lastName: p.lastName,
      message: p.message,
      status: 'open',
      submittedAt: parseClientTimestamp(p.submittedAt),
    })
    .returning();
  logger.info('GPR eligibility review request stored', {
    id: lead.id,
    blockReason: lead.blockReason,
  });

  // A mail failure is logged and leaves the stamp null; the row stands.
  if (!(await sendEligibilityReviewNotice(lead))) return lead;
  const now = new Date();
  const [updated] = await db
    .update(leads)
    .set({ teamNoticeSentAt: now, updatedAt: now })
    .where(eq(leads.id, lead.id))
    .returning();
  return updated;
}

async function sendEligibilityReviewNotice(lead: Lead): Promise<boolean> {
  const to = leadsConfig.notifyEmail;
  const mail = renderEligibilityReviewTeamNotice(lead);
  if (!to) {
    logger.info('[Email] LEADS_NOTIFY_EMAIL unset; team notice not mailed', {
      subject: mail.subject,
    });
    return false;
  }
  return sendLeadMail({ to, ...mail }, 'eligibility review team notice');
}

/**
 * Account creation from the funnel: the answers the visitor attested to.
 * Idempotent per e-mail + attestation time (a resent link stores nothing
 * new). No mails.
 */
export async function createEligibilitySignup(
  email: string,
  check: EligibilityCheck,
  meta: EligibilityLeadMeta = {}
): Promise<Lead> {
  const normalized = email.trim().toLowerCase();
  const attestedAt = new Date(check.attestedAt);
  const [existing] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.type, GPR_ELIG_SIGNUP_TYPE),
        eq(leads.email, normalized),
        eq(leads.attestedAt, attestedAt)
      )
    )
    .limit(1);
  if (existing) return existing;

  const [lead] = await db
    .insert(leads)
    .values({
      ...baseRow(GPR_ELIG_SIGNUP_TYPE, normalized, check, meta),
      attestedAt,
    })
    .returning();
  logger.info('GPR eligibility sign-up stored', {
    id: lead.id,
    result: lead.result,
  });
  return lead;
}

// ----------------------------------------------------------------- reminder

/** The cron's reminder mail for one gpr-elig-reminder row; true when sent. */
export async function sendEligibilityReminderDue(lead: Lead): Promise<boolean> {
  const fileFrom = lead.fileFrom ?? lead.canApplyFrom;
  if (!fileFrom || !/^\d{4}-\d{2}/.test(fileFrom)) {
    logger.warn('Eligibility reminder skipped: no filing date', {
      id: lead.id,
    });
    return false;
  }
  const mail = renderEligibilityReminderEmail({
    firstName: lead.firstName,
    fileFromLabel: formatFileFromLabel(fileFrom),
    checkUrl: `${leadsConfig.siteUrl}/check/3-step`,
    siteUrl: leadsConfig.siteUrl,
    senderName: leadsConfig.senderName,
  });
  return sendLeadMail(
    { to: lead.email, ...mail },
    'eligibility filing-date reminder'
  );
}

// -------------------------------------------------------------------- admin

export interface AdminEligibilityLead {
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
  answers: Record<string, unknown> | null;
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

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toAdmin(l: Lead): AdminEligibilityLead {
  return {
    id: l.id,
    type: l.type,
    createdAt: l.createdAt.toISOString(),
    email: l.email,
    firstName: l.firstName,
    lastName: l.lastName,
    message: l.message,
    ruleSet: l.ruleSet,
    result: l.result,
    blockReason: l.blockReason,
    answers: l.answers ?? null,
    fileFrom: l.fileFrom,
    reminderDueOn: l.reminderDueOn,
    reminderSentAt: iso(l.reminderSentAt),
    attestedAt: iso(l.attestedAt),
    status: l.status,
    repliedAt: iso(l.repliedAt),
    teamNoticeSentAt: iso(l.teamNoticeSentAt),
    referrer: l.referrer,
    landingPage: l.landingPage,
    utmSource: l.utmSource,
    utmMedium: l.utmMedium,
    utmCampaign: l.utmCampaign,
    utmTerm: l.utmTerm,
    utmContent: l.utmContent,
    gclid: l.gclid,
    fbclid: l.fbclid,
    via: l.via,
  };
}

/** Newest first, at most 200. */
export async function listEligibilityLeads(
  kind: GprEligLeadKind
): Promise<AdminEligibilityLead[]> {
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.type, GPR_ELIG_LEAD_TYPES[kind]))
    .orderBy(desc(leads.createdAt))
    .limit(200);
  return rows.map(toAdmin);
}

/**
 * Sets the follow-up state of an eligibility lead. 'replied' stamps
 * `replied_at` the first time. Returns null when no gpr-elig-* row has the id.
 */
export async function setEligibilityLeadStatus(
  id: string,
  status: GprEligReviewStatus
): Promise<AdminEligibilityLead | null> {
  const [row] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, id),
        inArray(leads.type, Object.values(GPR_ELIG_LEAD_TYPES))
      )
    )
    .limit(1);
  if (!row) return null;
  const now = new Date();
  const [updated] = await db
    .update(leads)
    .set({
      status,
      repliedAt: status === 'replied' ? (row.repliedAt ?? now) : row.repliedAt,
      updatedAt: now,
    })
    .where(eq(leads.id, id))
    .returning();
  return toAdmin(updated);
}
