/**
 * Escrow payout case controls (owner spec "GPR and bAV escrow payouts",
 * 30 Oct 2026) around the release flow in index.ts:
 *
 *  - client: upload a missing decision or say it has not arrived (EM),
 *    confirm receipt of the payment or report it missing (E5), download
 *    the TransferMate receipt; the account's post-signing payout status.
 *  - admin: payout hold, contact pause with next-contact date, "decision
 *    went to the client directly", the TransferMate onward transfer with
 *    its receipt, the expected arrival of a direct payment, tasks.
 *
 * Every change re-runs the payout e-mail planner for the case.
 */

import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../utils/db';
import { getPresignedUrl } from '../../utils/s3';
import { claimsTable } from '../../drizzle/schema/claims';
import { documents } from '../../drizzle/schema/shared';
import { payoutReleases } from '../../drizzle/schema/payout';
import { payoutLines } from '../../drizzle/schema/payout-queue';
import {
  payoutTasks,
  type PayoutTaskKind,
} from '../../drizzle/schema/payout-emails';
import { PayoutEmailService, PAYOUT_TASK_LABELS } from '../payout-emails';
import { expectedArrival } from '../payout-emails/planner';
import { OpsSettingsService } from '../ops-settings';
import { isIsoDate, todayBerlin, type IsoDate } from './deadlines';
import { normaliseCurrency } from './currency-routing';
import {
  checkUpload,
  PayoutFlowError,
  PayoutFlowService,
  type Actor,
  type ClientPayoutTask,
  type ClientTransferView,
} from './index';
import type { PayoutRouteCode } from './providers';
import { productOf } from '../payout-emails';

type ClaimRow = typeof claimsTable.$inferSelect;
type ReleaseRow = typeof payoutReleases.$inferSelect;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

async function updateClaim(
  claimId: string,
  set: Partial<typeof claimsTable.$inferInsert>
): Promise<ClaimRow> {
  const [row] = await db
    .update(claimsTable)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(claimsTable.id, claimId))
    .returning();
  if (!row) throw new PayoutFlowError('Claim not found', 404);
  return row;
}

export class PayoutEscrowService {
  // ---------------- client ----------------

  /** Tasks, decision request and transfer status for getClientState. */
  static async clientExtras(
    claim: ClaimRow,
    rows: ReleaseRow[],
    decisionPublished: boolean
  ): Promise<{
    tasks: ClientPayoutTask[];
    decisionRequest: {
      open: boolean;
      uploadedAt: string | null;
      notReceivedAt: string | null;
    };
    transfer: ClientTransferView | null;
  }> {
    const tasks: ClientPayoutTask[] = [];
    const live = rows.filter((r) => r.status !== 'cancelled');
    const pending = await PayoutFlowService.pendingClientUpload(claim.id);
    // EM: funds in, no verified decision, and the request is due (sent, or
    // known to have gone to the client).
    const requested = (await PayoutEmailService.log(claim.id)).some(
      (l) => l.template === 'EM'
    );
    const open =
      !decisionPublished &&
      live.length > 0 &&
      (requested || !!claim.decisionDirectToClientAt);
    if (open && !pending) {
      tasks.push({
        kind: 'upload_decision',
        id: live[0].id,
        title: 'Upload your decision letter',
        dueDate: null,
        href: '/account/payout/decision',
      });
    }

    const signed = [...live].reverse().find((r) => r.status === 'signed');
    let transfer: ClientTransferView | null = null;
    if (signed) {
      const [line] = await db
        .select()
        .from(payoutLines)
        .where(
          and(
            eq(payoutLines.payoutReleaseId, signed.id),
            eq(payoutLines.kind, 'client')
          )
        )
        .limit(1);
      const paidOn = line?.status === 'paid' ? (line.paidOn ?? null) : null;
      const route = (signed.route as PayoutRouteCode | null) ?? null;
      const product = productOf(claim);
      const timers = (await OpsSettingsService.payoutTimers())[product];
      const onwardDone = !!signed.onwardTransferDate;
      const stage: ClientTransferView['stage'] =
        route === 'B'
          ? onwardDone
            ? 'sent'
            : paidOn
              ? 'funding'
              : 'queued'
          : paidOn
            ? 'sent'
            : 'queued';
      const arrival =
        stage === 'sent'
          ? expectedArrival(
              {
                id: signed.id,
                status: 'signed',
                fundsRecordedOn: signed.valueDate,
                invitedOn: null,
                signable: true,
                route,
                queued: true,
                clientLinePaidOn: paidOn,
                onward: {
                  transferDate: signed.onwardTransferDate ?? null,
                  hasReceipt: !!signed.onwardReceiptDocumentId,
                  expectedArrival:
                    route === 'B' ? (signed.expectedArrivalDate ?? null) : null,
                },
                expectedArrival:
                  route === 'B' ? null : (signed.expectedArrivalDate ?? null),
                receiptStatus: null,
              },
              timers
            )
          : null;
      transfer = {
        releaseId: signed.id,
        route,
        stage,
        sentOn:
          stage === 'sent'
            ? route === 'B'
              ? (signed.onwardTransferDate ?? null)
              : paidOn
            : null,
        amountSent:
          stage !== 'sent'
            ? null
            : route === 'B'
              ? signed.onwardAmount !== null
                ? Number(signed.onwardAmount)
                : null
              : line
                ? Number(line.amount)
                : null,
        currency:
          route === 'B' && stage === 'sent'
            ? (signed.onwardCurrency ?? signed.account?.currency ?? 'EUR')
            : 'EUR',
        expectedArrival: arrival,
        hasReceipt: !!signed.onwardReceiptDocumentId,
        receiptStatus: signed.receiptStatus ?? null,
      };
      if (stage === 'sent' && !signed.receiptStatus) {
        tasks.push({
          kind: 'confirm_receipt',
          id: signed.id,
          title: 'Let us know when your payout arrives',
          dueDate: arrival,
          href: '/account/payout/receipt',
        });
      }
    }
    return {
      tasks,
      decisionRequest: {
        open,
        uploadedAt: pending ? iso(pending.createdAt) : null,
        notReceivedAt: iso(claim.decisionNotReceivedAt),
      },
      transfer,
    };
  }

  /** EM: the client uploads the decision; admin verifies and publishes. */
  static async clientUploadDecision(
    userId: string,
    files: File[]
  ): Promise<{ decisionId: string }> {
    const claim = await PayoutFlowService.claimForUser(userId);
    if (!files.length)
      throw new PayoutFlowError('Please add a scan or photo of the letter.');
    if (files.length > 1)
      throw new PayoutFlowError(
        'Please upload the letter as one PDF, or one photo at a time.'
      );
    checkUpload(files[0]);
    if (await PayoutFlowService.pendingClientUpload(claim.id))
      throw new PayoutFlowError(
        'We already have your upload and are checking it.',
        409
      );
    const view = await PayoutFlowService.recordDecision(
      claim.id,
      {
        file: files[0],
        source: 'client_upload',
        publish: false,
        // The client's copy: OCR still helps admin verify.
        runExtraction: true,
      },
      { id: userId }
    );
    await PayoutEmailService.openTask(
      { claim, managerEmail: null },
      {
        task: 'decision_upload',
        key: `decision_upload:${view.id}`,
        releaseId: null,
        urgent: false,
        detail:
          'The client uploaded a copy of the decision. Check it, record who received it and when, verify the review due date and publish it.',
      }
    );
    return { decisionId: view.id };
  }

  /** EM: "I have not received it" — admin obtains a copy. */
  static async clientDecisionNotReceived(userId: string): Promise<void> {
    const claim = await PayoutFlowService.claimForUser(userId);
    if (claim.decisionNotReceivedAt) return;
    await updateClaim(claim.id, { decisionNotReceivedAt: new Date() });
    await PayoutFlowService.audit(
      { id: userId },
      'payout_decision_not_received',
      claim.id,
      {}
    );
    await PayoutEmailService.openTask(
      { claim, managerEmail: null },
      {
        task: 'missing_decision',
        key: `decision_not_received:${claim.id}`,
        releaseId: null,
        urgent: false,
        detail:
          'The client says the decision has not arrived. Obtain a copy through the law firm or the issuing institution.',
      }
    );
  }

  /** E5: receipt confirmed, or reported missing (opens an investigation). */
  static async clientReceipt(
    userId: string,
    releaseId: string,
    status: 'confirmed' | 'not_received'
  ): Promise<void> {
    const claim = await PayoutFlowService.claimForUser(userId);
    const [r] = await db
      .select()
      .from(payoutReleases)
      .where(
        and(
          eq(payoutReleases.id, releaseId),
          eq(payoutReleases.claimId, claim.id),
          eq(payoutReleases.status, 'signed')
        )
      )
      .limit(1);
    if (!r) throw new PayoutFlowError('Payout not found', 404);
    if (r.receiptStatus === status) return;
    await db
      .update(payoutReleases)
      .set({
        receiptStatus: status,
        receiptStatusAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payoutReleases.id, r.id));
    await PayoutFlowService.audit(
      { id: userId },
      status === 'confirmed'
        ? 'payout_receipt_confirmed'
        : 'payout_not_received',
      claim.id,
      { releaseId }
    );
    if (status === 'confirmed')
      await this.resolveTasksByKind(claim.id, ['payment_not_received'], null);
    await PayoutEmailService.run(claim.id);
  }

  static async clientReceiptUrl(
    userId: string,
    releaseId: string
  ): Promise<string | null> {
    const claim = await PayoutFlowService.claimForUser(userId);
    const [r] = await db
      .select({ docId: payoutReleases.onwardReceiptDocumentId })
      .from(payoutReleases)
      .where(
        and(
          eq(payoutReleases.id, releaseId),
          eq(payoutReleases.claimId, claim.id)
        )
      )
      .limit(1);
    if (!r?.docId) return null;
    const [doc] = await db
      .select({ s3Key: documents.s3Key })
      .from(documents)
      .where(and(eq(documents.id, r.docId), eq(documents.userId, claim.userId)))
      .limit(1);
    return doc ? getPresignedUrl(doc.s3Key, 900) : null;
  }

  // ---------------- admin ----------------

  static async setPayoutHold(
    claimId: string,
    reason: string | null,
    actor: Actor
  ): Promise<void> {
    const text = reason?.trim() || null;
    await updateClaim(claimId, {
      payoutHoldReason: text,
      payoutHoldAt: text ? new Date() : null,
      payoutHoldBy: text ? actor.id : null,
    });
    await PayoutFlowService.audit(
      actor,
      text ? 'payout_hold_set' : 'payout_hold_cleared',
      claimId,
      { reason: text }
    );
    await PayoutEmailService.run(claimId);
  }

  /**
   * Client travelling, ill or otherwise unavailable: routine payout
   * reminders pause until the next-contact date. Deadline alerts and
   * payment confirmations continue.
   */
  static async setContactPause(
    claimId: string,
    input: { reason: string; nextContactDate: IsoDate | null } | null,
    actor: Actor
  ): Promise<void> {
    if (input) {
      if (!input.reason.trim())
        throw new PayoutFlowError('Enter why contact is paused');
      if (input.nextContactDate && !isIsoDate(input.nextContactDate))
        throw new PayoutFlowError('Invalid next contact date');
    }
    await updateClaim(claimId, {
      contactPauseReason: input ? input.reason.trim() : null,
      contactPausedAt: input ? new Date() : null,
      nextContactDate: input?.nextContactDate ?? null,
    });
    await PayoutFlowService.audit(
      actor,
      input ? 'payout_contact_paused' : 'payout_contact_resumed',
      claimId,
      input ?? {}
    );
    await PayoutEmailService.run(claimId);
  }

  /** The decision went to the client directly: EM goes at once. */
  static async setDecisionDirectToClient(
    claimId: string,
    direct: boolean,
    actor: Actor
  ): Promise<void> {
    await updateClaim(claimId, {
      decisionDirectToClientAt: direct ? new Date() : null,
    });
    await PayoutFlowService.audit(
      actor,
      'payout_decision_direct_to_client',
      claimId,
      { direct }
    );
    await PayoutEmailService.run(claimId);
  }

  private static async signedRelease(
    claimId: string,
    releaseId: string
  ): Promise<ReleaseRow> {
    const [r] = await db
      .select()
      .from(payoutReleases)
      .where(
        and(
          eq(payoutReleases.id, releaseId),
          eq(payoutReleases.claimId, claimId)
        )
      )
      .limit(1);
    if (!r) throw new PayoutFlowError('Release not found', 404);
    if (r.status !== 'signed')
      throw new PayoutFlowError('The payout is not authorised yet', 409);
    return r;
  }

  /**
   * Route B: the TransferMate onward payment. E4B goes once the amount,
   * currency, date, expected arrival and the client's receipt are all
   * recorded. Before payment is recorded as sent these can be corrected;
   * afterwards only through admin with an audit trail.
   */
  static async recordOnwardTransfer(
    claimId: string,
    releaseId: string,
    input: {
      amount?: number | null;
      currency?: string | null;
      transferDate?: IsoDate | null;
      expectedArrival?: IsoDate | null;
      receipt?: File | null;
    },
    actor: Actor
  ): Promise<ReleaseRow> {
    const r = await this.signedRelease(claimId, releaseId);
    if (r.route !== 'B')
      throw new PayoutFlowError(
        'Only TransferMate payouts have an onward transfer',
        409
      );
    const set: Partial<typeof payoutReleases.$inferInsert> = {
      onwardRecordedAt: new Date(),
      onwardRecordedBy: actor.id,
      updatedAt: new Date(),
    };
    if (input.amount !== undefined && input.amount !== null) {
      if (!(input.amount > 0))
        throw new PayoutFlowError('Enter the amount sent');
      set.onwardAmount = input.amount.toFixed(2);
    }
    if (input.currency) {
      const c = normaliseCurrency(input.currency);
      if (!/^[A-Z]{3}$/.test(c)) throw new PayoutFlowError('Invalid currency');
      set.onwardCurrency = c;
    }
    for (const [k, v] of [
      ['transfer date', input.transferDate],
      ['expected arrival', input.expectedArrival],
    ] as const)
      if (v && !isIsoDate(v)) throw new PayoutFlowError(`Invalid ${k}`);
    if (input.transferDate) set.onwardTransferDate = input.transferDate;
    if (input.expectedArrival) set.expectedArrivalDate = input.expectedArrival;
    if (input.receipt) {
      checkUpload(input.receipt);
      const claim = await PayoutFlowService.getClaim(claimId);
      set.onwardReceiptDocumentId = await PayoutFlowService.storeFile(
        claim,
        'transfermate',
        {
          name: input.receipt.name,
          type: input.receipt.type,
          bytes: Buffer.from(await input.receipt.arrayBuffer()),
        },
        'transfer_receipt',
        'transfer_receipt'
      );
    }
    const [row] = await db
      .update(payoutReleases)
      .set(set)
      .where(eq(payoutReleases.id, r.id))
      .returning();
    await PayoutFlowService.audit(
      actor,
      'payout_onward_transfer_recorded',
      claimId,
      {
        releaseId,
        amount: set.onwardAmount,
        currency: set.onwardCurrency,
        transferDate: set.onwardTransferDate,
        expectedArrival: set.expectedArrivalDate,
        receiptDocumentId: set.onwardReceiptDocumentId,
      }
    );
    if (
      row.onwardAmount &&
      row.onwardCurrency &&
      row.onwardTransferDate &&
      row.expectedArrivalDate &&
      row.onwardReceiptDocumentId
    )
      await this.resolveTasksByKind(
        claimId,
        ['transfer_record_incomplete', 'email_fields_missing'],
        actor.id
      );
    await PayoutEmailService.run(claimId);
    return row;
  }

  /** Direct payment: admin-entered expected arrival (schedules E5). */
  static async setExpectedArrival(
    claimId: string,
    releaseId: string,
    date: IsoDate | null,
    actor: Actor
  ): Promise<void> {
    if (date && !isIsoDate(date)) throw new PayoutFlowError('Invalid date');
    const r = await this.signedRelease(claimId, releaseId);
    await db
      .update(payoutReleases)
      .set({ expectedArrivalDate: date, updatedAt: new Date() })
      .where(eq(payoutReleases.id, r.id));
    await PayoutFlowService.audit(
      actor,
      'payout_expected_arrival_set',
      claimId,
      {
        releaseId,
        date,
      }
    );
    await PayoutEmailService.run(claimId);
  }

  static async resolveTasksByKind(
    claimId: string,
    kinds: PayoutTaskKind[],
    actorId: string | null
  ): Promise<void> {
    await db
      .update(payoutTasks)
      .set({
        status: 'done',
        resolvedAt: new Date(),
        resolvedBy: actorId,
        resolutionNote: 'Resolved by the recorded outcome',
      })
      .where(
        and(
          eq(payoutTasks.claimId, claimId),
          eq(payoutTasks.status, 'open'),
          inArray(payoutTasks.kind, kinds)
        )
      );
  }

  /** Admin claim page: escrow controls, e-mails and tasks. */
  static async adminView(claimId: string) {
    const claim = await PayoutFlowService.getClaim(claimId);
    const [emails, taskRows] = await Promise.all([
      PayoutEmailService.log(claimId),
      PayoutEmailService.tasks({ claimId }),
    ]);
    const releases = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.claimId, claimId))
      .orderBy(desc(payoutReleases.createdAt));
    return {
      today: todayBerlin(),
      hold: claim.payoutHoldAt
        ? { reason: claim.payoutHoldReason, at: iso(claim.payoutHoldAt) }
        : null,
      contactPause: claim.contactPausedAt
        ? {
            reason: claim.contactPauseReason,
            at: iso(claim.contactPausedAt),
            nextContactDate: claim.nextContactDate ?? null,
          }
        : null,
      decisionDirectToClientAt: iso(claim.decisionDirectToClientAt),
      decisionNotReceivedAt: iso(claim.decisionNotReceivedAt),
      transfers: releases
        .filter((r) => r.status === 'signed')
        .map((r) => ({
          releaseId: r.id,
          route: r.route,
          invitedAt: iso(r.invitedAt),
          signedAt: iso(r.signedAt),
          onwardAmount: r.onwardAmount !== null ? Number(r.onwardAmount) : null,
          onwardCurrency: r.onwardCurrency ?? r.account?.currency ?? null,
          onwardTransferDate: r.onwardTransferDate ?? null,
          hasReceipt: !!r.onwardReceiptDocumentId,
          expectedArrivalDate: r.expectedArrivalDate ?? null,
          receiptStatus: r.receiptStatus ?? null,
          receiptStatusAt: iso(r.receiptStatusAt),
        })),
      emails: emails.map((e) => ({
        id: e.id,
        template: e.template,
        status: e.status,
        recipient: e.recipient,
        bcc: e.bcc,
        sentAt: iso(e.sentAt),
        templateVersion: e.templateVersion,
      })),
      tasks: taskRows.map(({ task }) => ({
        id: task.id,
        kind: task.kind,
        label: PAYOUT_TASK_LABELS[task.kind as PayoutTaskKind] ?? task.kind,
        urgent: task.urgent,
        detail: task.detail,
        status: task.status,
        createdAt: iso(task.createdAt),
        resolvedAt: iso(task.resolvedAt),
        resolutionNote: task.resolutionNote,
      })),
    };
  }
}
