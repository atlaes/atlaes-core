/**
 * E1 "Funds received" from the statement upload (platform brief Part 2):
 * amount and value date from the statement are authoritative.
 *
 *  1. funds_receipts row: statement origin + frozen fee split
 *     (computeFeeSplit incl. the small-refund rule) + the Bescheid amount
 *     at that moment and the mismatch flag (snapshot for reconciliation).
 *  2. PayoutFlowService.onFundsRecorded (stream P1): release row, small-
 *     refund / mismatch flags on the claim, ClientUpdatesService
 *     .onFundsReceived, A1/A3 e-mail (gpr-payout/notifications templates,
 *     sent once per event).
 *  3. Invoice in Lexoffice; the number goes onto the claim and the release
 *     before the client can sign the ZE.
 */

import { desc, eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger, toErrorMeta } from '../../utils/logger';
import { auditLogs } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import { payoutDecisions } from '../../drizzle/schema/payout';
import {
  fundsReceipts,
  type FundsReceiptRow,
} from '../../drizzle/schema/payout-queue';
import { computeFeeSplit, type FeeSplit } from '../drv-pack/fee';
import { payoutFeeConfig } from './config';
import { InvoicingService } from '../invoicing';
import { isAmountMismatch } from './lines';
import { notifyPayoutFlowFundsRecorded } from './hooks';

export { isAmountMismatch };

export interface RecordFundsInput {
  claimId: string;
  amountEur: number;
  valueDate: string; // YYYY-MM-DD
  statementLineId?: string | null;
  statementReference?: string | null;
  actorId?: string | null;
}

export interface RecordFundsResult {
  receipt: FundsReceiptRow;
  split: FeeSplit;
  payoutReleaseId: string;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  amountMismatch: boolean;
}

export class FundsService {
  static async recordFundsReceived(
    input: RecordFundsInput
  ): Promise<RecordFundsResult> {
    const [claim] = await db
      .select({ id: claimsTable.id })
      .from(claimsTable)
      .where(eq(claimsTable.id, input.claimId))
      .limit(1);
    if (!claim) throw new Error('Claim not found');

    const cfg = payoutFeeConfig();
    const split = computeFeeSplit(input.amountEur, cfg);

    const [decision] = await db
      .select({ amount: payoutDecisions.refundAmountEur })
      .from(payoutDecisions)
      .where(eq(payoutDecisions.claimId, claim.id))
      .orderBy(desc(payoutDecisions.createdAt))
      .limit(1);
    const decisionAmount =
      decision?.amount != null ? Number(decision.amount) : null;
    const amountMismatch = isAmountMismatch(
      decisionAmount,
      split.amountReceived
    );

    // Release flow first: it validates the event and owns the client side.
    const payoutReleaseId = await notifyPayoutFlowFundsRecorded({
      claimId: claim.id,
      amountReceivedEur: split.amountReceived,
      valueDate: input.valueDate,
      statementReference: input.statementReference ?? null,
      actorId: input.actorId ?? null,
    });

    const [receipt] = await db
      .insert(fundsReceipts)
      .values({
        claimId: claim.id,
        statementLineId: input.statementLineId ?? null,
        payoutReleaseId,
        amountReceived: split.amountReceived.toFixed(2),
        valueDate: input.valueDate,
        fee: split.fee.toFixed(2),
        feeCapped: split.capped,
        smallRefund: split.smallRefund,
        lawFirmFee: split.lawFirmFee.toFixed(2),
        atlaesShare: split.atlaesShare.toFixed(2),
        clientAmount: split.clientAmount.toFixed(2),
        feeConfig: cfg,
        decisionAmount:
          decisionAmount != null ? decisionAmount.toFixed(2) : null,
        amountMismatch,
        recordedBy: input.actorId ?? null,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: input.actorId ?? null,
      action: 'funds_received',
      resource: 'claim',
      resourceId: claim.id,
      details: {
        receiptId: receipt.id,
        payoutReleaseId,
        statementLineId: input.statementLineId ?? null,
        amountReceived: split.amountReceived,
        valueDate: input.valueDate,
        fee: split.fee,
        capped: split.capped,
        smallRefund: split.smallRefund,
        atlaesShare: split.atlaesShare,
        lawFirmFee: split.lawFirmFee,
        clientAmount: split.clientAmount,
        decisionAmount,
        amountMismatch,
      },
    });

    // Invoice (Lexoffice) — the number must exist before the ZE.
    let invoiceNumber: string | null = null;
    let invoiceStatus: string | null = null;
    try {
      const inv = await InvoicingService.createForReceipt(
        receipt.id,
        input.actorId ?? null
      );
      invoiceNumber = inv.invoiceNumber;
      invoiceStatus = inv.status;
    } catch (error) {
      logger.error('[Funds] invoice step failed', toErrorMeta(error));
    }

    return {
      receipt,
      split,
      payoutReleaseId,
      invoiceNumber,
      invoiceStatus,
      amountMismatch,
    };
  }
}
