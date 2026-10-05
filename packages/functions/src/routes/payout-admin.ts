/**
 * ATLAES Admin side of the payout flow. Mounted at /api/admin/payout;
 * auth + admin like routes/admin.ts.
 *
 *   GET   /claims/:id                     decisions, releases, reports, flags
 *   POST  /claims/:id/decision            multipart { file, receivedAt?, decisionDate?,
 *                                          office?, refundAmountEur?, periods? (JSON),
 *                                          runExtraction? } — attach Bescheid + OCR (E2)
 *   PATCH /claims/:id/decision/:decisionId  corrections (JSON)
 *   POST  /claims/:id/funds               { amountEur, valueDate, reference? } —
 *                                          manual E1 via FundsService (receipt,
 *                                          release, invoice), like the statement upload
 *   PUT   /releases/:id/invoice           { invoiceNumber }
 *   POST  /releases/:id/clear-review      clears "payout details need review"
 *   GET   /customer-inputs                open missing-period reports
 *   POST  /customer-inputs/:id/resolve    { note? }
 */

import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validateUuidParams } from '../middleware/validate-uuid';
import { PayoutFlowService } from '../services/payout-flow';
import { FundsService } from '../services/payout-queue/funds';
import type { PayoutDecisionPeriod } from '../drizzle/schema/payout';
import { payoutFail, pid } from './payout';

const router = new Hono();
router.use('*', authMiddleware, adminMiddleware);

const actorOf = (c: Context) => {
  const u = c.get('user') as { id: string; email: string };
  return { id: u.id, email: u.email };
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const periodSchema = z.object({
  from: isoDate,
  to: isoDate,
  entgeltEur: z.number().nonnegative().nullable(),
  contributionsEur: z.number().nonnegative().nullable(),
});

async function json(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

const bad = (c: Context, details: unknown) =>
  c.json({ success: false, error: 'Validation failed', details }, 400);

router.get('/claims/:id', validateUuidParams('id'), async (c) => {
  try {
    return c.json({
      success: true,
      ...(await PayoutFlowService.getAdminState(pid(c, 'id'))),
    });
  } catch (error) {
    return payoutFail(c, error, 'Admin payout state');
  }
});

router.post('/claims/:id/decision', validateUuidParams('id'), async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string')
      return bad(c, { file: 'Bescheid file required' });
    const str = (k: string) => {
      const v = form.get(k);
      return typeof v === 'string' && v.trim() ? v.trim() : null;
    };
    const receivedAt = str('receivedAt');
    const decisionDate = str('decisionDate');
    if (receivedAt && !isoDate.safeParse(receivedAt).success)
      return bad(c, { receivedAt: 'YYYY-MM-DD' });
    if (decisionDate && !isoDate.safeParse(decisionDate).success)
      return bad(c, { decisionDate: 'YYYY-MM-DD' });
    const amountRaw = str('refundAmountEur');
    const amount = amountRaw ? Number(amountRaw.replace(',', '.')) : null;
    if (amount !== null && !(amount >= 0))
      return bad(c, { refundAmountEur: 'number' });
    let periods: PayoutDecisionPeriod[] | null = null;
    const periodsRaw = str('periods');
    if (periodsRaw) {
      const parsed = z.array(periodSchema).safeParse(JSON.parse(periodsRaw));
      if (!parsed.success) return bad(c, parsed.error.flatten());
      periods = parsed.data;
    }
    const decision = await PayoutFlowService.recordDecision(
      pid(c, 'id'),
      {
        file,
        receivedAt,
        decisionDate,
        office: str('office'),
        refundAmountEur: amount,
        periods,
        runExtraction: str('runExtraction') !== 'false',
      },
      actorOf(c)
    );
    return c.json({ success: true, decision }, 201);
  } catch (error) {
    return payoutFail(c, error, 'Admin payout decision');
  }
});

const correctionSchema = z.object({
  receivedAt: isoDate.optional(),
  decisionDate: isoDate.nullable().optional(),
  office: z.string().max(255).nullable().optional(),
  refundAmountEur: z.number().nonnegative().nullable().optional(),
  periods: z.array(periodSchema).optional(),
});

router.patch(
  '/claims/:id/decision/:decisionId',
  validateUuidParams('id', 'decisionId'),
  async (c) => {
    const parsed = correctionSchema.safeParse(await json(c));
    if (!parsed.success) return bad(c, parsed.error.flatten());
    try {
      const decision = await PayoutFlowService.updateDecision(
        pid(c, 'id'),
        pid(c, 'decisionId'),
        parsed.data,
        actorOf(c)
      );
      return c.json({ success: true, decision });
    } catch (error) {
      return payoutFail(c, error, 'Admin payout decision correction');
    }
  }
);

const fundsSchema = z.object({
  amountEur: z.number().positive(),
  valueDate: isoDate,
  reference: z.string().max(500).nullable().optional(),
});

router.post('/claims/:id/funds', validateUuidParams('id'), async (c) => {
  const parsed = fundsSchema.safeParse(await json(c));
  if (!parsed.success) return bad(c, parsed.error.flatten());
  try {
    // Through P3's FundsService: funds receipt + this flow's hook + invoice.
    const result = await FundsService.recordFundsReceived({
      claimId: pid(c, 'id'),
      amountEur: parsed.data.amountEur,
      valueDate: parsed.data.valueDate,
      statementReference: parsed.data.reference ?? null,
      actorId: actorOf(c).id,
    });
    return c.json(
      {
        success: true,
        releaseId: result.payoutReleaseId,
        receiptId: result.receipt.id,
        invoiceNumber: result.invoiceNumber,
        amountMismatch: result.amountMismatch,
      },
      201
    );
  } catch (error) {
    return payoutFail(c, error, 'Admin payout funds');
  }
});

router.put('/releases/:id/invoice', validateUuidParams('id'), async (c) => {
  const parsed = z
    .object({ invoiceNumber: z.string().trim().min(1).max(50) })
    .safeParse(await json(c));
  if (!parsed.success) return bad(c, parsed.error.flatten());
  try {
    await PayoutFlowService.setInvoiceNumber(
      pid(c, 'id'),
      parsed.data.invoiceNumber,
      actorOf(c)
    );
    return c.json({ success: true });
  } catch (error) {
    return payoutFail(c, error, 'Admin payout invoice number');
  }
});

router.post(
  '/releases/:id/clear-review',
  validateUuidParams('id'),
  async (c) => {
    try {
      await PayoutFlowService.clearReview(pid(c, 'id'), actorOf(c));
      return c.json({ success: true });
    } catch (error) {
      return payoutFail(c, error, 'Admin payout clear review');
    }
  }
);

router.get('/customer-inputs', async (c) => {
  try {
    return c.json({
      success: true,
      items: await PayoutFlowService.listOpenCustomerInputs(),
    });
  } catch (error) {
    return payoutFail(c, error, 'Admin payout reports');
  }
});

router.post(
  '/customer-inputs/:id/resolve',
  validateUuidParams('id'),
  async (c) => {
    const parsed = z
      .object({ note: z.string().max(2000).nullable().optional() })
      .safeParse(await json(c));
    if (!parsed.success) return bad(c, parsed.error.flatten());
    try {
      await PayoutFlowService.resolveCustomerInput(
        pid(c, 'id'),
        parsed.data.note ?? null,
        actorOf(c)
      );
      return c.json({ success: true });
    } catch (error) {
      return payoutFail(c, error, 'Admin payout resolve report');
    }
  }
);

export default router;
