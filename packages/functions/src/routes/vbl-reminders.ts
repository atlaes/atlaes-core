import { Hono } from 'hono';
import { z } from 'zod';
import { rateLimiter } from '../middleware/rate-limiter';
import { logger, toErrorMeta } from '../utils/logger';
import { createVblReminder } from '../services/leads/vbl-reminder';

/**
 * Public "Set reminder" for VBL waiting periods. Mounted at
 * /api/vbl/reminders (before /api/vbl).
 *
 *   POST /  { email, eligibleOn: 'YYYY-MM-DD', source, pensionProvider? }
 *
 * Stores the reminder only (services/leads/vbl-reminder.ts); no e-mail is
 * sent yet.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Invalid date');

export const vblReminderSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  eligibleOn: isoDate.refine((v) => {
    const t = Date.parse(`${v}T00:00:00Z`);
    const now = Date.now();
    // Only future start dates make sense; cap at 10 years ahead.
    return t > now - 24 * 3600 * 1000 && t < now + 10 * 365 * 24 * 3600 * 1000;
  }, 'The start date must be in the future'),
  source: z.enum(['calculator', 'get-started']),
  pensionProvider: z.string().trim().max(100).optional().nullable(),
});

const router = new Hono();

// Each visitor sets at most a few reminders.
router.use('*', rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }));

router.post('/', async (c) => {
  const parsed = vblReminderSchema.safeParse(
    await c.req.json().catch(() => ({}))
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
  try {
    const lead = await createVblReminder(parsed.data, {
      ipAddress:
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        c.req.header('x-real-ip') ??
        null,
      userAgent: c.req.header('user-agent') ?? null,
    });
    return c.json({ success: true, reminderDueOn: lead.reminderDueOn });
  } catch (error) {
    logger.error('VBL reminder failed', toErrorMeta(error));
    return c.json({ success: false, error: 'Could not set the reminder' }, 500);
  }
});

export default router;
