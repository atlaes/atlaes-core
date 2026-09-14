import { Hono } from 'hono';
import { z } from 'zod';
import type { Context, Next } from 'hono';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateUuidParams } from '../middleware/validate-uuid';
import {
  LAW_FIRM_CASE_EVENTS,
  LAW_FIRM_CASE_STATES,
  LAW_FIRM_SUBMISSION_CHANNELS,
} from '../drizzle/schema/claims';
import { LawFirmService, type FirmContext } from '../services/law-firm';

declare module 'hono' {
  interface ContextVariableMap {
    firm: FirmContext;
  }
}

/**
 * Resolves the caller's firm from membership and puts it on the context.
 * Without an active membership the portal answers 403 even for a user
 * whose JWT says law_firm (membership was removed after sign-in) and for
 * admins, who only get in when ops added them as a member.
 */
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

const lawFirm = new Hono();

lawFirm.use('*', authMiddleware, requireRole('law_firm', 'admin'), firmScope);

function fail(c: Context, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message === 'Claim not found'
      ? 404
      : message.startsWith('Invalid')
        ? 400
        : 500;
  if (status === 500) logger.error(`${fallback}:`, toErrorMeta(error));
  return c.json(
    { success: false, error: status === 500 ? fallback : message },
    status
  );
}

// Explicit parsing instead of @hono/zod-validator: combined with the
// UUID-param middleware, the validator's type inference gets deep enough
// to exhaust the compiler.
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

async function parseJson<T extends z.ZodTypeAny>(
  c: Context,
  schema: T
): Promise<z.SafeParseReturnType<unknown, z.infer<T>>> {
  let body: unknown = null;
  try {
    body = await c.req.json();
  } catch {
    body = null;
  }
  return schema.safeParse(body);
}

const claimId = (c: Context) => c.req.param('id') as string;

// Firm + membership for the signed-in user
lawFirm.get('/me', (c) => {
  const { firm, membership } = c.get('firm');
  const user = c.get('user');
  return c.json({
    success: true,
    firm,
    membership,
    user: { id: user.id, email: user.email },
  });
});

// Queue
const listQuerySchema = z.object({
  caseState: z.enum(LAW_FIRM_CASE_STATES).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

lawFirm.get('/claims', async (c) => {
  try {
    const { firm } = c.get('firm');
    const parsed = listQuerySchema.safeParse(c.req.query());
    if (!parsed.success) return invalid(c, parsed);
    const result = await LawFirmService.listClaimsForFirm(firm.id, parsed.data);
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Failed to list cases');
  }
});

// Case detail
lawFirm.get('/claims/:id', validateUuidParams('id'), async (c) => {
  try {
    const { firm } = c.get('firm');
    const detail = await LawFirmService.getCaseDetailForFirm(
      firm.id,
      claimId(c)
    );
    if (!detail) {
      return c.json({ success: false, error: 'Claim not found' }, 404);
    }
    return c.json({ success: true, ...detail });
  } catch (error) {
    return fail(c, error, 'Failed to load case');
  }
});

// Package / copy download (15-minute presigned URL)
for (const kind of ['package', 'copy'] as const) {
  lawFirm.get(`/claims/:id/${kind}`, validateUuidParams('id'), async (c) => {
    try {
      const { firm } = c.get('firm');
      const user = c.get('user');
      const result = await LawFirmService.getDownloadForFirm(
        firm.id,
        claimId(c),
        user.id,
        kind
      );
      if (!result) {
        return c.json(
          { success: false, error: `No ${kind} available for this case` },
          404
        );
      }
      return c.json({ success: true, ...result });
    } catch (error) {
      return fail(c, error, `Failed to get ${kind}`);
    }
  });
}

// File number
const referenceSchema = z.object({
  lawFirmRef: z.string().min(1).max(100),
});

lawFirm.put('/claims/:id/reference', validateUuidParams('id'), async (c) => {
  try {
    const { firm } = c.get('firm');
    const user = c.get('user');
    const parsed = await parseJson(c, referenceSchema);
    if (!parsed.success) return invalid(c, parsed);
    const result = await LawFirmService.setFirmReference(
      firm.id,
      claimId(c),
      user.id,
      parsed.data.lawFirmRef
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Failed to set reference');
  }
});

// Case events
const eventSchema = z.object({
  event: z.enum(LAW_FIRM_CASE_EVENTS),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  channel: z.enum(LAW_FIRM_SUBMISSION_CHANNELS).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

lawFirm.post('/claims/:id/events', validateUuidParams('id'), async (c) => {
  try {
    const { firm } = c.get('firm');
    const user = c.get('user');
    const parsed = await parseJson(c, eventSchema);
    if (!parsed.success) return invalid(c, parsed);
    const result = await LawFirmService.recordCaseEvent(
      firm.id,
      claimId(c),
      user.id,
      parsed.data
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Failed to record event');
  }
});

// Correspondence upload (multipart: file, note?, receivedDate?)
lawFirm.post(
  '/claims/:id/correspondence',
  validateUuidParams('id'),
  async (c) => {
    try {
      const { firm } = c.get('firm');
      const user = c.get('user');
      const form = await c.req.formData();
      const file = form.get('file');
      if (!file || !(file instanceof File)) {
        return c.json({ success: false, error: 'No file provided' }, 400);
      }
      const note = form.get('note');
      const receivedDate = form.get('receivedDate');
      if (
        typeof receivedDate === 'string' &&
        receivedDate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)
      ) {
        return c.json(
          { success: false, error: 'Invalid receivedDate (YYYY-MM-DD)' },
          400
        );
      }
      const item = await LawFirmService.addCorrespondence(
        firm.id,
        claimId(c),
        user.id,
        file,
        {
          note: typeof note === 'string' ? note.slice(0, 1000) : null,
          receivedDate:
            typeof receivedDate === 'string' && receivedDate
              ? receivedDate
              : null,
        }
      );
      return c.json({ success: true, correspondence: item }, 201);
    } catch (error) {
      return fail(c, error, 'Failed to upload correspondence');
    }
  }
);

lawFirm.get(
  '/claims/:id/correspondence/:corrId/download',
  validateUuidParams('id', 'corrId'),
  async (c) => {
    try {
      const { firm } = c.get('firm');
      const result = await LawFirmService.getCorrespondenceDownload(
        claimId(c),
        c.req.param('corrId') as string,
        firm.id
      );
      if (!result) {
        return c.json({ success: false, error: 'Not found' }, 404);
      }
      return c.json({ success: true, ...result });
    } catch (error) {
      return fail(c, error, 'Failed to get download');
    }
  }
);

export default lawFirm;
