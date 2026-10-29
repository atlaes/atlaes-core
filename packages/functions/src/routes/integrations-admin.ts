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
 *
 *   GET    /payout-accounts         ATLAES + provider collection accounts
 *   PUT    /payout-accounts/:key    { holder, iban, bic?, bank?, reference? }
 *                                   — IBAN/BIC validated, audited, ops mailed
 *   GET    /ops-settings            postal authority, dispatch operator
 *   PUT    /ops-settings/:key       validated per key, audited
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
import {
  PAYOUT_ACCOUNT_KEYS,
  PayoutAccountError,
  PayoutAccountsService,
  type PayoutAccountKey,
} from '../services/payout-accounts';
import {
  OPS_SETTING_KEYS,
  OpsSettingsError,
  OpsSettingsService,
  type OpsSettingKey,
} from '../services/ops-settings';

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

const payoutAccountSchema = z.object({
  holder: z.string().max(200),
  iban: z.string().max(60),
  bic: z.string().max(20).nullish(),
  bank: z.string().max(200).nullish(),
  reference: z.string().max(140).nullish(),
});

router.get('/payout-accounts', async (c) => {
  try {
    return c.json({
      success: true,
      accounts: await PayoutAccountsService.list(),
    });
  } catch (error) {
    return fail(c, error, 'Loading the payout accounts');
  }
});

router.put('/payout-accounts/:key', async (c) => {
  const key = c.req.param('key');
  if (!(PAYOUT_ACCOUNT_KEYS as readonly string[]).includes(key)) {
    return c.json({ success: false, error: 'Unknown payout account' }, 404);
  }
  const parsed = payoutAccountSchema.safeParse(
    await c.req.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Holder and IBAN are required' },
      400
    );
  }
  try {
    const user = c.get('user') as { id: string; email: string };
    const account = await PayoutAccountsService.set(
      key as PayoutAccountKey,
      parsed.data,
      { ...actorOf(c), email: user.email }
    );
    return c.json({ success: true, account });
  } catch (error) {
    if (error instanceof PayoutAccountError) {
      return c.json(
        { success: false, error: error.message, field: error.field ?? null },
        400
      );
    }
    return fail(c, error, 'Saving the payout account');
  }
});

router.get('/ops-settings', async (c) => {
  try {
    return c.json({ success: true, settings: await OpsSettingsService.list() });
  } catch (error) {
    return fail(c, error, 'Loading the settings');
  }
});

router.put('/ops-settings/:key', async (c) => {
  const key = c.req.param('key');
  if (!(OPS_SETTING_KEYS as readonly string[]).includes(key)) {
    return c.json({ success: false, error: 'Unknown setting' }, 404);
  }
  try {
    const setting = await OpsSettingsService.set(
      key as OpsSettingKey,
      await c.req.json().catch(() => ({})),
      actorOf(c)
    );
    return c.json({ success: true, setting });
  } catch (error) {
    if (error instanceof OpsSettingsError) {
      return c.json(
        { success: false, error: error.message, issues: error.issues },
        400
      );
    }
    return fail(c, error, 'Saving the setting');
  }
});

export default router;
