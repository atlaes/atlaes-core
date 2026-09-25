import { Hono } from 'hono';
import { z } from 'zod';
import { rateLimiter } from '../middleware/rate-limiter';
import { logger, toErrorMeta } from '../utils/logger';
import { createLead } from '../services/leads';
import { LEAD_TYPES } from '../services/leads/config';
import { toContributionMonth } from '../services/leads/reminder';

/**
 * Public lead capture (replaces the Apps Script web app). The embedded
 * widgets POST JSON with `Content-Type: text/plain` in no-cors mode, so the
 * body is read as text and parsed here instead of via zValidator (which
 * rejects non-JSON content types).
 */

const str = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

const boolish = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => v === true || v === 'true' || v === 'on' || v === '1');

const monthYear = z.union([z.string(), z.number()]).optional().nullable();

export const leadPayloadSchema = z.object({
  type: z.enum(LEAD_TYPES),
  placement: str(100),
  email: z.string().trim().toLowerCase().email().max(255),
  firstName: str(100),
  lastName: str(100),
  reminderOptIn: boolish,
  lastContributionMonth: str(7), // YYYY-MM
  // Widget legacy fields (gpr-v0900-capture / gpr-wegzug-capture)
  exitMonth: monthYear,
  exitYear: monthYear,
  // Refund-widget context
  verdict: str(20),
  verdictTitle: str(255),
  citizenship: str(255),
  residence: str(255),
  canApplyFrom: str(50),
  estimateEUR: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Math.round(Number(v));
      return Number.isFinite(n) ? n : null;
    }),
  incomeEntered: str(50),
  // Attribution
  widget: str(100),
  via: str(100),
  referrer: str(2000),
  pageReferrer: str(2000),
  landingPage: str(2000),
  utmSource: str(255),
  utmMedium: str(255),
  utmCampaign: str(255),
  utmTerm: str(255),
  utmContent: str(255),
  gclid: str(255),
  fbclid: str(255),
  // Consent
  consentPrivacy: boolish,
  consentMarketing: boolish,
  submittedAt: str(40),
  // Honeypot
  hp: str(500),
});

export type LeadPayload = z.infer<typeof leadPayloadSchema>;

const SNAKE_ALIASES: Record<string, string> = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_term: 'utmTerm',
  utm_content: 'utmContent',
  landing_page: 'landingPage',
  page_referrer: 'pageReferrer',
  first_name: 'firstName',
  last_name: 'lastName',
  reminder_opt_in: 'reminderOptIn',
  last_contribution_month: 'lastContributionMonth',
  consent_privacy: 'consentPrivacy',
  consent_marketing: 'consentMarketing',
  submitted_at: 'submittedAt',
};

/** Accepts snake_case attribution keys alongside the camelCase ones. */
export function normalizeLeadBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  for (const [snake, camel] of Object.entries(SNAKE_ALIASES)) {
    if (out[camel] === undefined && out[snake] !== undefined) {
      out[camel] = out[snake];
    }
  }
  return out;
}

const router = new Hono();

// Tighter than the global limiter: a widget submits once per visitor.
router.use('*', rateLimiter({ windowMs: 60 * 60 * 1000, max: 20 }));

router.post('/', async (c) => {
  let raw: unknown;
  try {
    const text = await c.req.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = leadPayloadSchema.safeParse(
    normalizeLeadBody(raw as Record<string, unknown>)
  );
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      400
    );
  }
  const p = parsed.data;

  // Honeypot filled in: bots get a success response, nothing is stored.
  if (p.hp) {
    logger.warn('Lead honeypot triggered', { type: p.type });
    return c.json({ success: true });
  }

  const lastContributionMonth =
    p.lastContributionMonth ??
    (p.exitMonth && p.exitYear
      ? toContributionMonth(p.exitMonth, p.exitYear)
      : null);

  try {
    const lead = await createLead(
      {
        type: p.type,
        placement: p.placement,
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        reminderOptIn: p.reminderOptIn,
        lastContributionMonth,
        verdict: p.verdict,
        verdictTitle: p.verdictTitle,
        citizenship: p.citizenship,
        residence: p.residence,
        canApplyFrom: p.canApplyFrom,
        estimateEur: p.estimateEUR,
        incomeEntered: p.incomeEntered,
        widget: p.widget,
        via: p.via,
        referrer: p.referrer ?? p.pageReferrer,
        landingPage: p.landingPage,
        utmSource: p.utmSource,
        utmMedium: p.utmMedium,
        utmCampaign: p.utmCampaign,
        utmTerm: p.utmTerm,
        utmContent: p.utmContent,
        gclid: p.gclid,
        fbclid: p.fbclid,
        consentPrivacy: p.consentPrivacy,
        consentMarketing: p.consentMarketing,
        submittedAt: p.submittedAt,
      },
      {
        ipAddress:
          c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
          c.req.header('x-real-ip') ??
          null,
        userAgent: c.req.header('user-agent') ?? null,
      }
    );
    return c.json({ success: true, id: lead.id }, 201);
  } catch (error) {
    logger.error('Lead create error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Failed to store lead' }, 500);
  }
});

export default router;
