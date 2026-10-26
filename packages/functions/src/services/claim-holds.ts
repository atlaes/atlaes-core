/**
 * Submission holds (migration 0023): a submitted, paid claim that cannot
 * go out automatically waits here for ATLAES ops. Setting a hold stores it
 * on the claim, records a workflow entry and an audit row, and mails
 * OPS_NOTIFICATION_EMAIL; clearing it records the same trail. Nothing in
 * this module decides *when* a hold applies, see submitClaim and the
 * package services.
 */

import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import {
  claimsTable,
  claimWorkflowStates,
  SUBMISSION_HOLD_LABELS,
  type ClaimSubmissionHold,
} from '../drizzle/schema/claims';
import { auditLogs } from '../drizzle/schema/shared';
import { sendOpsClaimAttentionEmail } from './email';

export interface SetHoldOptions {
  /** Who triggered it: the claimant's submission or an admin action. */
  triggeredBy: 'user' | 'system' | 'admin';
  /** Audit-log user (claimant or admin). */
  userId?: string | null;
  /** Lines for the ops email (after the reason). */
  detailLines?: string[];
  /** Default true; false when ops themselves just caused the change. */
  notify?: boolean;
}

function adminClaimUrl(claimId: string): string {
  return `${env.ADMIN_URL.replace(/\/$/, '')}/claims/${claimId}`;
}

export class ClaimHoldService {
  /** Puts the claim on hold and notifies ops (the email is non-fatal). */
  static async setHold(
    claimId: string,
    hold: ClaimSubmissionHold,
    reason: string,
    options: SetHoldOptions
  ): Promise<void> {
    const [row] = await db
      .select({
        status: claimsTable.status,
        firstName: claimsTable.firstName,
        lastName: claimsTable.lastName,
        previousHold: claimsTable.submissionHold,
      })
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);
    if (!row) throw new Error('Claim not found');

    const now = new Date();
    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({
          submissionHold: hold,
          submissionHoldReason: reason,
          submissionHoldAt: now,
          updatedAt: now,
        })
        .where(eq(claimsTable.id, claimId));
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: row.status ?? 'submitted',
        previousState: row.status ?? 'submitted',
        triggeredBy: options.triggeredBy,
        metadata: {
          action: 'submission_hold_set',
          hold,
          reason,
          previousHold: row.previousHold ?? null,
        },
      });
      await tx.insert(auditLogs).values({
        userId: options.userId ?? null,
        action: 'claim_submission_hold_set',
        resource: 'claim',
        resourceId: claimId,
        details: { hold, reason, previousHold: row.previousHold ?? null },
      });
    });

    logger.warn('Claim put on submission hold', { claimId, hold, reason });
    if (options.notify === false) return;

    const name =
      [row.firstName, row.lastName].filter(Boolean).join(' ') || 'a claimant';
    try {
      await this.notifyOps({
        subject: `${SUBMISSION_HOLD_LABELS[hold]}: ${name} (claim ${claimId.slice(0, 8)})`,
        summary: SUBMISSION_HOLD_LABELS[hold],
        detailLines: [reason, ...(options.detailLines ?? [])],
        claimUrl: adminClaimUrl(claimId),
      });
    } catch (error) {
      logger.error('Ops hold notice failed', {
        claimId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clears the claim's hold. With `only`, clears just those hold kinds
   * (e.g. a successful package build clears 'awaiting_provider_data' and
   * 'package_generation_failed' but never 'manual_submission_required').
   * Returns the cleared hold, or null when nothing changed.
   */
  static async clearHold(
    claimId: string,
    options: {
      triggeredBy: 'user' | 'system' | 'admin';
      userId?: string | null;
      note?: string;
      only?: readonly ClaimSubmissionHold[];
    }
  ): Promise<ClaimSubmissionHold | null> {
    const [row] = await db
      .select({
        status: claimsTable.status,
        hold: claimsTable.submissionHold,
      })
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);
    const hold = (row?.hold ?? null) as ClaimSubmissionHold | null;
    if (!row || !hold) return null;
    if (options.only && !options.only.includes(hold)) return null;

    const now = new Date();
    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({
          submissionHold: null,
          submissionHoldReason: null,
          submissionHoldAt: null,
          updatedAt: now,
        })
        .where(eq(claimsTable.id, claimId));
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: row.status ?? 'submitted',
        previousState: row.status ?? 'submitted',
        triggeredBy: options.triggeredBy,
        metadata: {
          action: 'submission_hold_cleared',
          hold,
          note: options.note ?? null,
        },
      });
      await tx.insert(auditLogs).values({
        userId: options.userId ?? null,
        action: 'claim_submission_hold_cleared',
        resource: 'claim',
        resourceId: claimId,
        details: { hold, note: options.note ?? null },
      });
    });
    logger.info('Claim submission hold cleared', { claimId, hold });
    return hold;
  }

  /** Separate so tests can stub the email without touching SES. */
  static async notifyOps(
    details: Parameters<typeof sendOpsClaimAttentionEmail>[0]
  ): Promise<boolean> {
    return sendOpsClaimAttentionEmail(details);
  }
}
