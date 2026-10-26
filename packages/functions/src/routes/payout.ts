/**
 * Client payout flow (GPR `/account/payout/**`, Figma section B 08–13).
 * Mounted at /api/account/payout; every route needs the client's JWT and
 * acts on the client's own current claim.
 *
 *   GET  /                              tasks + decision + release state
 *   GET  /decision/:id/document         { url } presigned Bescheid (15 min)
 *   POST /decision/:id/confirm          option A "Confirm periods and amounts"
 *   POST /decision/:id/report           multipart { description, files[] }
 *   PUT  /release/:id/bank              bank details → { ok, errors, release }
 *   GET  /release/:id/routes            route options (text F) for non-EUR
 *   PUT  /release/:id/route             { option: 1 | 2 | 3 }
 *   GET  /release/:id/ze                ZE preview text (D + E) + blockers
 *   POST /release/:id/sign              { signature: data:image/png;base64,… }
 *   GET  /release/:id/ze.pdf            signed ZE (redirect to S3 / bytes)
 */

import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { validateUuidParams } from '../middleware/validate-uuid';
import { PayoutFlowError, PayoutFlowService } from '../services/payout-flow';

const router = new Hono();
router.use('*', authMiddleware);

const userId = (c: Context) => (c.get('user') as { id: string }).id;
export const pid = (c: Context, name: string): string =>
  c.req.param(name) ?? '';

export function payoutFail(c: Context, error: unknown, label: string) {
  if (error instanceof PayoutFlowError) {
    return c.json(
      { success: false, error: error.message, code: error.code ?? null },
      error.status
    );
  }
  logger.error(`${label} error:`, toErrorMeta(error));
  return c.json({ success: false, error: 'Request failed' }, 500);
}

async function json(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function clientIp(c: Context): string | null {
  const fwd = c.req.header('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || c.req.header('x-real-ip') || null;
}

router.get('/', async (c) => {
  try {
    return c.json({
      success: true,
      ...(await PayoutFlowService.getClientState(userId(c))),
    });
  } catch (error) {
    return payoutFail(c, error, 'Payout state');
  }
});

router.get('/decision/:id/document', validateUuidParams('id'), async (c) => {
  try {
    const url = await PayoutFlowService.decisionDocumentUrl(
      userId(c),
      pid(c, 'id')
    );
    return c.json({ success: true, url });
  } catch (error) {
    return payoutFail(c, error, 'Payout decision document');
  }
});

router.post('/decision/:id/confirm', validateUuidParams('id'), async (c) => {
  try {
    await PayoutFlowService.confirmDecision(userId(c), pid(c, 'id'));
    return c.json({ success: true });
  } catch (error) {
    return payoutFail(c, error, 'Payout decision confirm');
  }
});

router.post('/decision/:id/report', validateUuidParams('id'), async (c) => {
  try {
    const form = await c.req.formData();
    const description = String(form.get('description') ?? '');
    const files = form
      .getAll('files')
      .filter((f) => typeof f !== 'string') as unknown as File[];
    const result = await PayoutFlowService.reportMissing(
      userId(c),
      pid(c, 'id'),
      description,
      files
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    return payoutFail(c, error, 'Payout missing-period report');
  }
});

const opt = z.string().trim().max(64).nullish();
const bankSchema = z.object({
  accountHolder: z.string().trim().max(255),
  bank: z.string().trim().max(255),
  country: z.string().trim().length(2),
  currency: z.string().trim().length(3),
  iban: opt,
  bic: opt,
  accountNumber: opt,
  routingNumber: opt,
  ifsc: opt,
  sortCode: opt,
  bsb: opt,
  transitNumber: opt,
  institutionNumber: opt,
  clabe: opt,
});

router.put('/release/:id/bank', validateUuidParams('id'), async (c) => {
  const parsed = bankSchema.safeParse(await json(c));
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      400
    );
  }
  try {
    const { validation, release } = await PayoutFlowService.saveBankDetails(
      userId(c),
      pid(c, 'id'),
      parsed.data
    );
    return c.json(
      { success: validation.ok, errors: validation.errors, release },
      validation.ok ? 200 : 422
    );
  } catch (error) {
    return payoutFail(c, error, 'Payout bank details');
  }
});

router.get('/release/:id/routes', validateUuidParams('id'), async (c) => {
  try {
    const options = await PayoutFlowService.getRouteOptions(
      userId(c),
      pid(c, 'id')
    );
    return c.json({ success: true, ...options });
  } catch (error) {
    return payoutFail(c, error, 'Payout route options');
  }
});

const routeSchema = z.object({
  option: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

router.put('/release/:id/route', validateUuidParams('id'), async (c) => {
  const parsed = routeSchema.safeParse(await json(c));
  if (!parsed.success)
    return c.json({ success: false, error: 'Choose an option' }, 400);
  try {
    const result = await PayoutFlowService.chooseRoute(
      userId(c),
      pid(c, 'id'),
      parsed.data.option
    );
    return c.json(
      { success: !result.errors, ...result },
      result.errors ? 422 : 200
    );
  } catch (error) {
    return payoutFail(c, error, 'Payout route choice');
  }
});

router.get('/release/:id/ze', validateUuidParams('id'), async (c) => {
  try {
    const preview = await PayoutFlowService.previewZe(userId(c), pid(c, 'id'));
    return c.json({ success: true, ...preview });
  } catch (error) {
    return payoutFail(c, error, 'Payout ZE preview');
  }
});

const signSchema = z.object({
  signature: z.string().max(1_000_000),
  confirmed: z.literal(true),
});

router.post('/release/:id/sign', validateUuidParams('id'), async (c) => {
  const parsed = signSchema.safeParse(await json(c));
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error:
          'Please draw your signature and confirm the payment instruction.',
      },
      400
    );
  }
  try {
    const result = await PayoutFlowService.sign(userId(c), pid(c, 'id'), {
      signatureDataUrl: parsed.data.signature,
      ip: clientIp(c),
    });
    return c.json({ success: true, ...result });
  } catch (error) {
    return payoutFail(c, error, 'Payout ZE signing');
  }
});

router.get('/release/:id/ze.pdf', validateUuidParams('id'), async (c) => {
  try {
    const url = await PayoutFlowService.signedZeUrl(userId(c), pid(c, 'id'));
    if (url) return c.json({ success: true, url });
    const bytes = await PayoutFlowService.signedZeBytes(
      userId(c),
      pid(c, 'id')
    );
    return new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (error) {
    return payoutFail(c, error, 'Payout ZE download');
  }
});

export default router;
