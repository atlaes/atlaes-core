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
 *   PUT   /claims/:id/deregistration-surcharge  { enabled, reason? } — EUR 50
 *                                          surcharge flag (no Abmeldebestätigung);
 *                                          409 once funds are recorded
 *   PUT   /releases/:id/invoice           { invoiceNumber }
 *   POST  /releases/:id/clear-review      clears "payout details need review"
 *   GET   /customer-inputs                open missing-period reports
 *   POST  /customer-inputs/:id/resolve    { note? }
 *
 * Escrow payout controls (owner spec 30 Oct 2026):
 *   GET   /claims/:id/escrow              hold, contact pause, transfers,
 *                                          e-mail log, payout tasks
 *   POST  /claims/:id/decision/:decisionId/publish  { receivedAt?, atlaesReceivedAt?,
 *                                          reviewBy?, recipient? } — verify a
 *                                          client upload and start the review
 *   PUT   /claims/:id/hold                { reason: string | null }
 *   PUT   /claims/:id/contact-pause       { reason, nextContactDate? } | null
 *   PUT   /claims/:id/decision-direct     { direct: boolean }
 *   POST  /claims/:id/releases/:releaseId/onward  multipart { amount?, currency?,
 *                                          transferDate?, expectedArrival?, receipt? }
 *   PUT   /claims/:id/releases/:releaseId/arrival { date: YYYY-MM-DD | null }
 *   GET   /tasks                          open payout tasks (all cases)
 *   POST  /tasks/:id/resolve              { note? }
 */

import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validateUuidParams } from '../middleware/validate-uuid';
import { PayoutFlowService } from '../services/payout-flow';
import { PayoutEscrowService } from '../services/payout-flow/escrow';
import {
  PayoutEmailService,
  PAYOUT_TASK_LABELS,
} from '../services/payout-emails';
import { FundsService } from '../services/payout-queue/funds';
import {
  DECISION_RECIPIENTS,
  type DecisionRecipient,
  type PayoutDecisionPeriod,
} from '../drizzle/schema/payout';
import type { PayoutTaskKind } from '../drizzle/schema/payout-emails';
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
    const atlaesReceivedAt = str('atlaesReceivedAt');
    const reviewBy = str('reviewBy');
    for (const [k, v] of Object.entries({
      receivedAt,
      decisionDate,
      atlaesReceivedAt,
      reviewBy,
    }))
      if (v && !isoDate.safeParse(v).success)
        return bad(c, { [k]: 'YYYY-MM-DD' });
    const recipient = str('recipient');
    if (
      recipient &&
      !(DECISION_RECIPIENTS as readonly string[]).includes(recipient)
    )
      return bad(c, { recipient: DECISION_RECIPIENTS.join(' | ') });
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
        recipient: recipient as DecisionRecipient | null,
        atlaesReceivedAt,
        reviewBy,
        // Admin uploads are verified on entry; publish=false keeps a draft.
        publish: str('publish') !== 'false',
        source: 'admin',
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
  recipient: z.enum(DECISION_RECIPIENTS).nullable().optional(),
  atlaesReceivedAt: isoDate.optional(),
  reviewBy: isoDate.optional(),
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

router.put(
  '/claims/:id/deregistration-surcharge',
  validateUuidParams('id'),
  async (c) => {
    const parsed = z
      .object({
        enabled: z.boolean(),
        reason: z.string().trim().max(500).nullish(),
      })
      .safeParse(await json(c));
    if (!parsed.success) return bad(c, parsed.error.flatten());
    try {
      const surcharge = await PayoutFlowService.setDeregistrationSurcharge(
        pid(c, 'id'),
        parsed.data,
        actorOf(c)
      );
      return c.json({ success: true, deregistrationSurcharge: surcharge });
    } catch (error) {
      return payoutFail(c, error, 'Admin deregistration surcharge');
    }
  }
);

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

// ---------------- escrow payout controls ----------------

router.get('/claims/:id/escrow', validateUuidParams('id'), async (c) => {
  try {
    return c.json({
      success: true,
      ...(await PayoutEscrowService.adminView(pid(c, 'id'))),
    });
  } catch (error) {
    return payoutFail(c, error, 'Admin escrow state');
  }
});

const publishSchema = z.object({
  receivedAt: isoDate.nullish(),
  atlaesReceivedAt: isoDate.nullish(),
  reviewBy: isoDate.nullish(),
  recipient: z.enum(DECISION_RECIPIENTS).nullish(),
});

router.post(
  '/claims/:id/decision/:decisionId/publish',
  validateUuidParams('id', 'decisionId'),
  async (c) => {
    const parsed = publishSchema.safeParse(await json(c));
    if (!parsed.success) return bad(c, parsed.error.flatten());
    try {
      const decision = await PayoutFlowService.publishDecision(
        pid(c, 'id'),
        pid(c, 'decisionId'),
        parsed.data,
        actorOf(c)
      );
      return c.json({ success: true, decision });
    } catch (error) {
      return payoutFail(c, error, 'Admin publish decision');
    }
  }
);

router.put('/claims/:id/hold', validateUuidParams('id'), async (c) => {
  const parsed = z
    .object({ reason: z.string().trim().max(1000).nullable() })
    .safeParse(await json(c));
  if (!parsed.success) return bad(c, parsed.error.flatten());
  try {
    await PayoutEscrowService.setPayoutHold(
      pid(c, 'id'),
      parsed.data.reason,
      actorOf(c)
    );
    return c.json({ success: true });
  } catch (error) {
    return payoutFail(c, error, 'Admin payout hold');
  }
});

router.put('/claims/:id/contact-pause', validateUuidParams('id'), async (c) => {
  const parsed = z
    .object({
      reason: z.string().trim().min(1).max(1000),
      nextContactDate: isoDate.nullish(),
    })
    .nullable()
    .safeParse(await json(c));
  if (!parsed.success) return bad(c, parsed.error.flatten());
  try {
    await PayoutEscrowService.setContactPause(
      pid(c, 'id'),
      parsed.data
        ? {
            reason: parsed.data.reason,
            nextContactDate: parsed.data.nextContactDate ?? null,
          }
        : null,
      actorOf(c)
    );
    return c.json({ success: true });
  } catch (error) {
    return payoutFail(c, error, 'Admin contact pause');
  }
});

router.put(
  '/claims/:id/decision-direct',
  validateUuidParams('id'),
  async (c) => {
    const parsed = z.object({ direct: z.boolean() }).safeParse(await json(c));
    if (!parsed.success) return bad(c, parsed.error.flatten());
    try {
      await PayoutEscrowService.setDecisionDirectToClient(
        pid(c, 'id'),
        parsed.data.direct,
        actorOf(c)
      );
      return c.json({ success: true });
    } catch (error) {
      return payoutFail(c, error, 'Admin decision direct to client');
    }
  }
);

router.post(
  '/claims/:id/releases/:releaseId/onward',
  validateUuidParams('id', 'releaseId'),
  async (c) => {
    try {
      const form = await c.req.formData();
      const str = (k: string) => {
        const v = form.get(k);
        return typeof v === 'string' && v.trim() ? v.trim() : null;
      };
      const amountRaw = str('amount');
      const amount = amountRaw ? Number(amountRaw.replace(',', '.')) : null;
      if (amount !== null && !(amount > 0)) return bad(c, { amount: 'number' });
      const receipt = form.get('receipt');
      const row = await PayoutEscrowService.recordOnwardTransfer(
        pid(c, 'id'),
        pid(c, 'releaseId'),
        {
          amount,
          currency: str('currency'),
          transferDate: str('transferDate'),
          expectedArrival: str('expectedArrival'),
          receipt: receipt && typeof receipt !== 'string' ? receipt : null,
        },
        actorOf(c)
      );
      return c.json({ success: true, releaseId: row.id });
    } catch (error) {
      return payoutFail(c, error, 'Admin onward transfer');
    }
  }
);

router.put(
  '/claims/:id/releases/:releaseId/arrival',
  validateUuidParams('id', 'releaseId'),
  async (c) => {
    const parsed = z
      .object({ date: isoDate.nullable() })
      .safeParse(await json(c));
    if (!parsed.success) return bad(c, parsed.error.flatten());
    try {
      await PayoutEscrowService.setExpectedArrival(
        pid(c, 'id'),
        pid(c, 'releaseId'),
        parsed.data.date,
        actorOf(c)
      );
      return c.json({ success: true });
    } catch (error) {
      return payoutFail(c, error, 'Admin expected arrival');
    }
  }
);

router.get('/tasks', async (c) => {
  try {
    const rows = await PayoutEmailService.tasks({ open: true });
    return c.json({
      success: true,
      items: rows.map(({ task, firstName, lastName }) => ({
        id: task.id,
        claimId: task.claimId,
        client: [firstName, lastName].filter(Boolean).join(' ') || null,
        kind: task.kind,
        label: PAYOUT_TASK_LABELS[task.kind as PayoutTaskKind] ?? task.kind,
        urgent: task.urgent,
        detail: task.detail,
        createdAt: task.createdAt ? task.createdAt.toISOString() : null,
      })),
    });
  } catch (error) {
    return payoutFail(c, error, 'Admin payout tasks');
  }
});

router.post('/tasks/:id/resolve', validateUuidParams('id'), async (c) => {
  const parsed = z
    .object({ note: z.string().trim().max(2000).nullish() })
    .safeParse(await json(c));
  if (!parsed.success) return bad(c, parsed.error.flatten());
  try {
    const ok = await PayoutEmailService.resolveTask(
      pid(c, 'id'),
      actorOf(c).id,
      parsed.data.note ?? null
    );
    if (!ok) return c.json({ success: false, error: 'Task not open' }, 409);
    return c.json({ success: true });
  } catch (error) {
    return payoutFail(c, error, 'Admin resolve payout task');
  }
});

export default router;
