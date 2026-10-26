/**
 * Law-firm payout queue and account-statement upload (platform brief
 * Part 2: E1, §5 payout queue, §6 invoicing).
 *
 *  - `lawFirmPayouts` → /api/law-firm/payouts (law-firm role, firm
 *    membership, portal security — same chain as routes/law-firm.ts).
 *  - `adminPayouts` → /api/admin/payouts (ATLAES admin: reconciliation
 *    queue, small-refund settlement list, invoice corrections).
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Context, Next } from 'hono';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateUuidParams } from '../middleware/validate-uuid';
import { LawFirmService, type FirmContext } from '../services/law-firm';
import {
  portalClientIp,
  requirePortalSecurity,
} from '../services/totp/portal-guard';
import { StatementImportService } from '../services/statement-import';
import { PayoutQueueService } from '../services/payout-queue';
import { InvoicingService } from '../services/invoicing';
import { STATEMENT_MAX_BYTES } from '../services/payout-queue/config';

declare module 'hono' {
  interface ContextVariableMap {
    firm: FirmContext;
  }
}

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
  const status = /not found$/i.test(message)
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

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const columnMapSchema = z.object({
  valueDate: z.string().min(1),
  amount: z.string().min(1),
  reference: z.string().min(1),
  payer: z.string().min(1).nullable().optional(),
});

async function readUpload(c: Context) {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid upload: no file provided');
  }
  if (file.size > STATEMENT_MAX_BYTES) {
    throw new Error('Invalid upload: file larger than 5 MB');
  }
  const mapRaw = form.get('columnMap');
  let columnMap: z.infer<typeof columnMapSchema> | null = null;
  if (typeof mapRaw === 'string' && mapRaw) {
    let parsedJson: unknown = null;
    try {
      parsedJson = JSON.parse(mapRaw);
    } catch {
      throw new Error('Invalid column mapping');
    }
    const parsed = columnMapSchema.safeParse(parsedJson);
    if (!parsed.success) throw new Error('Invalid column mapping');
    columnMap = parsed.data;
  }
  return {
    fileName: file.name || 'statement',
    buf: Buffer.from(await file.arrayBuffer()),
    columnMap,
  };
}

// ---------------------------------------------------------------------------
// Law firm
// ---------------------------------------------------------------------------

export const lawFirmPayouts = new Hono();

lawFirmPayouts.use(
  '*',
  authMiddleware,
  requireRole('law_firm', 'admin'),
  firmScope,
  requirePortalSecurity
);

// Payout queue
lawFirmPayouts.get('/', async (c) => {
  try {
    const { firm } = c.get('firm');
    const queue = await PayoutQueueService.listQueue(firm.id);
    return c.json({ success: true, ...queue });
  } catch (error) {
    return fail(c, error, 'Failed to load payout queue');
  }
});

lawFirmPayouts.get('/export.csv', async (c) => {
  try {
    const { firm } = c.get('firm');
    const csv = await PayoutQueueService.exportCsv(firm.id);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Uebersicht_Ueberweisungen_${day}.csv"`,
      },
    });
  } catch (error) {
    return fail(c, error, 'Failed to export payout queue');
  }
});

lawFirmPayouts.post('/lines/:id/paid', validateUuidParams('id'), async (c) => {
  try {
    const { firm } = c.get('firm');
    const parsed = await body(
      c,
      z.object({ paidOn: isoDate.optional() }).nullable()
    );
    if (!parsed.success) return invalid(c, parsed);
    const result = await PayoutQueueService.markLinePaid({
      firmId: firm.id,
      lineId: c.req.param('id') as string,
      paidOn: parsed.data?.paidOn ?? null,
      actorId: c.get('user').id,
      ip: portalClientIp(c),
    });
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Failed to mark line paid');
  }
});

lawFirmPayouts.get(
  '/claims/:id/:kind{ze|bescheid}',
  validateUuidParams('id'),
  async (c) => {
    try {
      const { firm } = c.get('firm');
      const result = await PayoutQueueService.getDownload({
        firmId: firm.id,
        claimId: c.req.param('id') as string,
        kind: c.req.param('kind') as 'ze' | 'bescheid',
        actorId: c.get('user').id,
        ip: portalClientIp(c),
      });
      if (!result)
        return c.json({ success: false, error: 'Not available' }, 404);
      return c.json({ success: true, ...result });
    } catch (error) {
      return fail(c, error, 'Failed to get download');
    }
  }
);

// Statement upload
lawFirmPayouts.get('/statements/last', async (c) => {
  try {
    const { firm } = c.get('firm');
    const last = await StatementImportService.lastUpload(firm.id);
    return c.json({ success: true, last });
  } catch (error) {
    return fail(c, error, 'Failed to load last upload');
  }
});

lawFirmPayouts.post('/statements/preview', async (c) => {
  try {
    const { firm } = c.get('firm');
    const upload = await readUpload(c);
    const preview = await StatementImportService.preview(
      firm.id,
      upload.fileName,
      upload.buf
    );
    return c.json({ success: true, preview });
  } catch (error) {
    return fail(c, error, 'Failed to read statement');
  }
});

lawFirmPayouts.post('/statements', async (c) => {
  try {
    const { firm } = c.get('firm');
    const upload = await readUpload(c);
    const result = await StatementImportService.importStatement({
      firmId: firm.id,
      userId: c.get('user').id,
      fileName: upload.fileName,
      buf: upload.buf,
      columnMap: upload.columnMap,
      ip: portalClientIp(c),
    });
    return c.json({ success: true, result });
  } catch (error) {
    return fail(c, error, 'Failed to import statement');
  }
});

lawFirmPayouts.get('/statements/:id', validateUuidParams('id'), async (c) => {
  try {
    const { firm } = c.get('firm');
    const result = await StatementImportService.getImport(
      firm.id,
      c.req.param('id') as string
    );
    if (!result) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, result });
  } catch (error) {
    return fail(c, error, 'Failed to load statement');
  }
});

lawFirmPayouts.get('/reconciliation', async (c) => {
  try {
    const { firm } = c.get('firm');
    const lines = await StatementImportService.listReconciliation(firm.id);
    return c.json({ success: true, lines });
  } catch (error) {
    return fail(c, error, 'Failed to load reconciliation queue');
  }
});

lawFirmPayouts.post(
  '/reconciliation/:id/suggest',
  validateUuidParams('id'),
  async (c) => {
    try {
      const { firm } = c.get('firm');
      const parsed = await body(
        c,
        z.object({ note: z.string().trim().min(1).max(1000) })
      );
      if (!parsed.success) return invalid(c, parsed);
      await StatementImportService.suggest({
        firmId: firm.id,
        lineId: c.req.param('id') as string,
        note: parsed.data.note,
        userId: c.get('user').id,
      });
      return c.json({ success: true });
    } catch (error) {
      return fail(c, error, 'Failed to save suggestion');
    }
  }
);

// ---------------------------------------------------------------------------
// ATLAES admin
// ---------------------------------------------------------------------------

export const adminPayouts = new Hono();

adminPayouts.use('*', authMiddleware, requireRole('admin'));

adminPayouts.get('/reconciliation', async (c) => {
  try {
    const lines = await StatementImportService.listReconciliation(null);
    return c.json({ success: true, lines });
  } catch (error) {
    return fail(c, error, 'Failed to load reconciliation queue');
  }
});

adminPayouts.post(
  '/reconciliation/:id/assign',
  validateUuidParams('id'),
  async (c) => {
    try {
      const parsed = await body(
        c,
        z.object({
          claimId: z.string().uuid(),
          note: z.string().max(1000).optional(),
        })
      );
      if (!parsed.success) return invalid(c, parsed);
      await StatementImportService.assign({
        lineId: c.req.param('id') as string,
        claimId: parsed.data.claimId,
        adminId: c.get('user').id,
        note: parsed.data.note ?? null,
      });
      return c.json({ success: true });
    } catch (error) {
      return fail(c, error, 'Failed to assign receipt');
    }
  }
);

adminPayouts.post(
  '/reconciliation/:id/dismiss',
  validateUuidParams('id'),
  async (c) => {
    try {
      const parsed = await body(
        c,
        z.object({ note: z.string().trim().min(1).max(1000) })
      );
      if (!parsed.success) return invalid(c, parsed);
      await StatementImportService.dismiss({
        lineId: c.req.param('id') as string,
        adminId: c.get('user').id,
        note: parsed.data.note,
      });
      return c.json({ success: true });
    } catch (error) {
      return fail(c, error, 'Failed to dismiss receipt');
    }
  }
);

adminPayouts.get('/small-refunds.csv', async (c) => {
  try {
    const csv = await PayoutQueueService.smallRefundSettlementCsv();
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="small-refund-annual-settlement.csv"',
      },
    });
  } catch (error) {
    return fail(c, error, 'Failed to export settlement list');
  }
});

adminPayouts.get(
  '/claims/:id/invoices',
  validateUuidParams('id'),
  async (c) => {
    try {
      const invoices = await InvoicingService.listForClaim(
        c.req.param('id') as string
      );
      return c.json({ success: true, invoices });
    } catch (error) {
      return fail(c, error, 'Failed to load invoices');
    }
  }
);

adminPayouts.post(
  '/invoices/:id/retry',
  validateUuidParams('id'),
  async (c) => {
    try {
      const invoice = await InvoicingService.retryPending(
        c.req.param('id') as string,
        c.get('user').id
      );
      return c.json({ success: true, invoice });
    } catch (error) {
      return fail(c, error, 'Failed to retry invoice');
    }
  }
);

// Corrections only by cancellation (+ optional new invoice), brief §6.
adminPayouts.post(
  '/invoices/:id/cancel',
  validateUuidParams('id'),
  async (c) => {
    try {
      const parsed = await body(
        c,
        z.object({
          reason: z.string().trim().min(1).max(1000),
          reissue: z.boolean().default(true),
        })
      );
      if (!parsed.success) return invalid(c, parsed);
      const result = await InvoicingService.cancel(
        c.req.param('id') as string,
        {
          reissue: parsed.data.reissue,
          reason: parsed.data.reason,
          actorId: c.get('user').id,
        }
      );
      return c.json({ success: true, ...result });
    } catch (error) {
      return fail(c, error, 'Failed to cancel invoice');
    }
  }
);

export default lawFirmPayouts;
