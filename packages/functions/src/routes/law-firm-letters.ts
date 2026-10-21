/**
 * Return channel (owner answer 6): DRV letters the law firm uploads in
 * bulk, and the ATLAES "needs attention" queue for them.
 *
 *  - `lawFirmLetters` → /api/law-firm/letters (law-firm role, firm
 *    membership, portal security — same chain as routes/law-firm.ts).
 *  - `adminLetters` → /api/admin/letters (ATLAES admin).
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Context, Next } from 'hono';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateUuidParams } from '../middleware/validate-uuid';
import { LawFirmService } from '../services/law-firm';
import {
  portalClientIp,
  requirePortalSecurity,
} from '../services/totp/portal-guard';
import {
  LawFirmLettersService,
  LetterError,
} from '../services/law-firm-letters';
import { PayoutFlowError } from '../services/payout-flow';

const firmScope = async (c: Context, next: Next) => {
  const user = c.get('user');
  const ctx = await LawFirmService.getFirmContext(user.id);
  if (!ctx) {
    return c.json(
      { success: false, error: 'Forbidden: no active law-firm membership' },
      403
    );
  }
  c.set('firm', ctx);
  await next();
};

function fail(c: Context, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status: 400 | 403 | 404 | 409 | 500 =
    error instanceof LetterError || error instanceof PayoutFlowError
      ? error.status
      : /not found$/i.test(message)
        ? 404
        : /^Invalid/.test(message)
          ? 400
          : 500;
  if (status === 500) logger.error(`${fallback}:`, toErrorMeta(error));
  return c.json(
    { success: false, error: status === 500 ? fallback : message },
    status
  );
}

async function body<T extends z.ZodTypeAny>(c: Context, schema: T) {
  let raw: unknown = null;
  try {
    raw = await c.req.json();
  } catch {
    raw = null;
  }
  return schema.safeParse(raw) as z.SafeParseReturnType<unknown, z.infer<T>>;
}

function invalid(c: Context, result: z.SafeParseError<unknown>) {
  return c.json(
    {
      success: false,
      error: 'Validation failed',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
    400
  );
}

const actorOf = (c: Context) => {
  const user = c.get('user');
  return { id: user.id, email: user.email };
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const note = z.string().trim().max(2000);

// ---------------------------------------------------------------------------
// Law firm
// ---------------------------------------------------------------------------

export const lawFirmLetters = new Hono();

lawFirmLetters.use(
  '*',
  authMiddleware,
  requireRole('law_firm', 'admin'),
  firmScope,
  requirePortalSecurity
);

lawFirmLetters.get('/', async (c) => {
  try {
    const { firm } = c.get('firm');
    const letters = await LawFirmLettersService.listForFirm(firm.id);
    return c.json({ success: true, letters });
  } catch (error) {
    return fail(c, error, 'Failed to load letters');
  }
});

// One file per request; the page sends a batch two at a time.
lawFirmLetters.post('/', async (c) => {
  try {
    const { firm } = c.get('firm');
    const form = await c.req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return c.json(
        { success: false, error: 'Invalid upload: no file provided' },
        400
      );
    }
    const result = await LawFirmLettersService.upload({
      firmId: firm.id,
      userId: c.get('user').id,
      file,
      ip: portalClientIp(c),
    });
    return c.json({ success: true, ...result }, result.duplicate ? 200 : 201);
  } catch (error) {
    return fail(c, error, 'Failed to upload letter');
  }
});

// ---------------------------------------------------------------------------
// ATLAES admin
// ---------------------------------------------------------------------------

export const adminLetters = new Hono();

adminLetters.use('*', authMiddleware, requireRole('admin'));

adminLetters.get('/', async (c) => {
  try {
    const view = c.req.query('view') === 'handled' ? 'handled' : 'attention';
    const letters = await LawFirmLettersService.listAdmin(view);
    return c.json({ success: true, letters });
  } catch (error) {
    return fail(c, error, 'Failed to load letters');
  }
});

adminLetters.get('/count', async (c) => {
  try {
    const attention = await LawFirmLettersService.attentionCount();
    return c.json({ success: true, attention });
  } catch (error) {
    return fail(c, error, 'Failed to count letters');
  }
});

adminLetters.get('/:id/file', validateUuidParams('id'), async (c) => {
  try {
    const file = await LawFirmLettersService.fileUrl(
      c.req.param('id') as string,
      actorOf(c)
    );
    return c.json({ success: true, ...file });
  } catch (error) {
    return fail(c, error, 'Failed to get file');
  }
});

adminLetters.get('/:id/cases', validateUuidParams('id'), async (c) => {
  try {
    const cases = await LawFirmLettersService.searchCases(
      c.req.param('id') as string,
      c.req.query('q') ?? ''
    );
    return c.json({ success: true, cases });
  } catch (error) {
    return fail(c, error, 'Failed to search cases');
  }
});

adminLetters.post('/:id/assign', validateUuidParams('id'), async (c) => {
  try {
    const parsed = await body(
      c,
      z.object({ claimId: z.string().uuid(), note: note.optional() })
    );
    if (!parsed.success) return invalid(c, parsed);
    const letter = await LawFirmLettersService.assign(
      c.req.param('id') as string,
      parsed.data.claimId,
      actorOf(c),
      parsed.data.note || null
    );
    return c.json({ success: true, letter });
  } catch (error) {
    return fail(c, error, 'Failed to file letter');
  }
});

adminLetters.post('/:id/dismiss', validateUuidParams('id'), async (c) => {
  try {
    const parsed = await body(c, z.object({ note: note.min(1) }));
    if (!parsed.success) return invalid(c, parsed);
    const letter = await LawFirmLettersService.dismiss(
      c.req.param('id') as string,
      actorOf(c),
      parsed.data.note
    );
    return c.json({ success: true, letter });
  } catch (error) {
    return fail(c, error, 'Failed to dismiss letter');
  }
});

const completeSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('record_decision'),
    receivedAt: isoDate.nullable().optional(),
    note: note.nullable().optional(),
  }),
  z.object({
    action: z.literal('notify_client'),
    customerAction: z.string().trim().min(1).max(1000),
    customerActionDue: isoDate.nullable().optional(),
    infoRequestSource: z.enum(['customer', 'file']),
    note: note.nullable().optional(),
  }),
  z.object({ action: z.literal('mark_handled'), note: note.min(1) }),
]);

adminLetters.post('/:id/complete', validateUuidParams('id'), async (c) => {
  try {
    const parsed = await body(c, completeSchema);
    if (!parsed.success) return invalid(c, parsed);
    const out = await LawFirmLettersService.complete(
      c.req.param('id') as string,
      parsed.data,
      actorOf(c)
    );
    return c.json({ success: true, ...out });
  } catch (error) {
    return fail(c, error, 'Failed to release the next step');
  }
});

export default lawFirmLetters;
