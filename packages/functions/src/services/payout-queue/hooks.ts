/**
 * Cross-stream hook for the E1 path: the client release flow (stream P1,
 * services/payout-flow). `PayoutFlowService.onFundsRecorded` creates the
 * release row (fee split frozen), sets the small-refund flag, feeds the
 * client-update engine (`ClientUpdatesService.onFundsReceived`), checks
 * the Bescheid amount (mismatch flag + ops notice) and sends A1/A3 once
 * per event — so the statement upload does not repeat those steps.
 */

import { PayoutFlowService } from '../payout-flow';

export interface FundsRecordedEvent {
  claimId: string;
  amountReceivedEur: number;
  valueDate: string;
  statementReference: string | null;
  actorId: string | null;
}

/** Returns the payout_releases row id the flow created. */
export async function notifyPayoutFlowFundsRecorded(
  event: FundsRecordedEvent
): Promise<string> {
  const release = await PayoutFlowService.onFundsRecorded(
    event.claimId,
    {
      amountEur: event.amountReceivedEur,
      valueDate: event.valueDate,
      statementReference: event.statementReference,
    },
    event.actorId ? { id: event.actorId } : null
  );
  return release.id;
}

/** Lexoffice number onto the (still open) release; the ZE reads it. */
export async function setReleaseInvoiceNumber(
  releaseId: string,
  invoiceNumber: string,
  actorId: string | null
): Promise<void> {
  await PayoutFlowService.setInvoiceNumber(
    releaseId,
    invoiceNumber,
    actorId ? { id: actorId } : null
  );
}
