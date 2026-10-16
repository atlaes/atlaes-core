/**
 * Integration credentials set by ops in the admin. Mounted at
 * /api/admin/integrations; auth + admin like routes/admin.ts.
 *
 *   GET    /lexoffice        status: source (admin / env / none), last 4,
 *                            company name, who changed it and when
 *   PUT    /lexoffice        { apiKey } — checked with Lexware, then stored
 *                            sealed; the key is never returned
 *   DELETE /lexoffice        remove the admin key (env secret applies again)
 *   POST   /lexoffice/test   check the key invoicing would use right now
 */

import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { logger, toErrorMeta } from '../utils/logger';
import {
  IntegrationKeyError,
  IntegrationSettingsService,
  type Actor,
} from '../services/integration-settings';

const router = new Hono();
router.use('*', authMiddleware, adminMiddleware);

const actorOf = (c: Context): Actor => {
  const fwd = c.req.header('x-forwarded-for');
  return {
    id: (c.get('user') as { id: string }).id,
    ipAddress: fwd?.split(',')[0]?.trim() || c.req.header('x-real-ip') || null,
    userAgent: c.req.header('user-agent') ?? null,
  };
};

function fail(c: Context, error: unknown, label: string) {
  if (error instanceof IntegrationKeyError) {
    return c.json({ success: false, error: error.message }, error.status);
  }
  logger.error(`[Integrations] ${label} failed`, toErrorMeta(error));
  return c.json({ success: false, error: `${label} failed` }, 500);
}

const keySchema = z.object({ apiKey: z.string().min(1).max(512) });

router.get('/lexoffice', async (c) => {
  try {
    return c.json({
      success: true,
      ...(await IntegrationSettingsService.lexofficeStatus()),
    });
  } catch (error) {
    return fail(c, error, 'Loading the Lexware settings');
  }
});

router.put('/lexoffice', async (c) => {
  const parsed = keySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ success: false, error: 'apiKey is required' }, 400);
  }
  try {
    return c.json({
      success: true,
      ...(await IntegrationSettingsService.setLexofficeKey(
        parsed.data.apiKey,
        actorOf(c)
      )),
    });
  } catch (error) {
    return fail(c, error, 'Saving the Lexware key');
  }
});

router.delete('/lexoffice', async (c) => {
  try {
    return c.json({
      success: true,
      ...(await IntegrationSettingsService.removeLexofficeKey(actorOf(c))),
    });
  } catch (error) {
    return fail(c, error, 'Removing the Lexware key');
  }
});

router.post('/lexoffice/test', async (c) => {
  try {
    return c.json({
      success: true,
      ...(await IntegrationSettingsService.testLexoffice()),
    });
  } catch (error) {
    return fail(c, error, 'Checking the Lexware connection');
  }
});

export default router;
