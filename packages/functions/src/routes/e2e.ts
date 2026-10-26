import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { isE2eRequest } from '../utils/e2e';
import { logger, toErrorMeta } from '../utils/logger';
import { E2eCleanupService } from '../services/e2e-cleanup';

/**
 * Staging e2e support endpoints, mounted at /api/e2e. Every route answers
 * exactly like an unknown path (the global 404 body) unless the request
 * passes the e2e guard, so the endpoints are not discoverable and are dead
 * in production (APP_STAGE = 'production').
 */
const e2e = new Hono();

function notFound(c: Context) {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: c.req.path,
    },
    404
  );
}

const cleanupSchema = z
  .object({
    emails: z.array(z.string().email()).max(200).optional(),
    // Sweep leftovers of crashed runs: every @e2e.test row older than this.
    olderThanMinutes: z
      .number()
      .int()
      .min(0)
      .max(60 * 24 * 365)
      .optional(),
  })
  .refine(
    (v) => (v.emails?.length ?? 0) > 0 || v.olderThanMinutes !== undefined,
    {
      message: 'Pass emails and/or olderThanMinutes',
    }
  );

e2e.post('/cleanup', async (c) => {
  if (!isE2eRequest(c)) return notFound(c);

  const body = await c.req.json().catch(() => null);
  const parsed = cleanupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Invalid request', issues: parsed.error.issues },
      400
    );
  }

  try {
    const result = await E2eCleanupService.cleanup(parsed.data);
    return c.json({ success: true, ...result });
  } catch (error) {
    logger.error('E2E cleanup failed', toErrorMeta(error));
    return c.json({ success: false, error: 'Cleanup failed' }, 500);
  }
});

export default e2e;
