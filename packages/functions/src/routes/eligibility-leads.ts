import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { rateLimiter } from '../middleware/rate-limiter';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateUuidParams } from '../middleware/validate-uuid';
import { logger, toErrorMeta } from '../utils/logger';
import {
  createEligibilityReminder,
  createEligibilityReview,
  eligibilityLeadPayloadSchema,
  GPR_ELIG_LEAD_TYPES,
  GPR_ELIG_REVIEW_STATUSES,
  listEligibilityLeads,
  setEligibilityLeadStatus,
  type GprEligLeadKind,
} from '../services/leads/gpr-eligibility';
import { normalizeLeadBody } from './leads';

/**
 * GPR eligibility check (/check/3-step) records; the check itself runs in
 * the browser (services/leads/gpr-eligibility.ts).
 *
 * Public, mounted at /api/eligibility-leads:
 *   POST /  { kind: 'reminder' | 'review', email, ..., ruleSet, result,
 *            blockReason?, answers, fileFrom?, attribution } → 201 {id}
 *   Like /api/leads the body is read as text, so `Content-Type:
 *   text/plain` (no-cors) works as well as application/json.
 *
 * Admin, mounted at /api/admin/eligibility-leads:
 *   GET  /?type=review|reminder|signup   newest first, at most 200
 *   POST /:id/status { status: 'open' | 'replied' | 'closed' }
 */

const validationError = (c: Context, error: z.ZodError) =>
  c.json(
    {
      success: false,
      error: 'Validation failed',
      issues: error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
    400
  );

const eligibilityLeads = new Hono();

// A visitor submits once or twice per check.
eligibilityLeads.use('*', rateLimiter({ windowMs: 60 * 60 * 1000, max: 20 }));

eligibilityLeads.post('/', async (c) => {
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
  const body = normalizeLeadBody(raw as Record<string, unknown>);

  // Honeypot filled in: bots get a success response, nothing is stored.
  if (typeof body.hp === 'string' && body.hp.trim()) {
    logger.warn('Eligibility lead honeypot triggered', { kind: body.kind });
    return c.json({ success: true });
  }

  const parsed = eligibilityLeadPayloadSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  const p = parsed.data;

  const meta = {
    ipAddress:
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      null,
    userAgent: c.req.header('user-agent') ?? null,
  };
  try {
    const lead =
      p.kind === 'reminder'
        ? await createEligibilityReminder(p, meta)
        : await createEligibilityReview(p, meta);
    return c.json({ success: true, id: lead.id }, 201);
  } catch (error) {
    logger.error('Eligibility lead create error:', toErrorMeta(error));
    return c.json(
      { success: false, error: 'Failed to store the request' },
      500
    );
  }
});

export default eligibilityLeads;

// ------------------------------------------------------------------- admin

export const adminEligibilityLeads = new Hono();
adminEligibilityLeads.use('*', authMiddleware, requireRole('admin'));

adminEligibilityLeads.get('/', async (c) => {
  const type = c.req.query('type') || 'review';
  if (!Object.prototype.hasOwnProperty.call(GPR_ELIG_LEAD_TYPES, type)) {
    return c.json({ success: false, error: 'Unknown type' }, 400);
  }
  try {
    const leads = await listEligibilityLeads(type as GprEligLeadKind);
    return c.json({ success: true, leads });
  } catch (error) {
    logger.error('Admin eligibility leads error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Failed to load leads' }, 500);
  }
});

const statusSchema = z.object({ status: z.enum(GPR_ELIG_REVIEW_STATUSES) });

adminEligibilityLeads.post(
  '/:id/status',
  validateUuidParams('id'),
  async (c) => {
    const parsed = statusSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationError(c, parsed.error);
    try {
      const lead = await setEligibilityLeadStatus(
        c.req.param('id') ?? '',
        parsed.data.status
      );
      if (!lead) return c.json({ success: false, error: 'Not found' }, 404);
      return c.json({ success: true, lead });
    } catch (error) {
      logger.error('Admin eligibility lead status error:', toErrorMeta(error));
      return c.json({ success: false, error: 'Failed to update' }, 500);
    }
  }
);
