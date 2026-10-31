/**
 * Escrow payout e-mails and admin follow-ups (owner spec "GPR and bAV
 * escrow payouts", v1.0, 30 Oct 2026).
 *
 * `run(claimId)` loads a fresh snapshot of the case, asks the planner
 * (planner.ts) what is due and executes it: e-mails through the send-once
 * log, admin tasks once per case event (with an ops notice). Called after
 * every payout event (decision recorded or published, funds matched,
 * review answered, signed, transfer recorded, receipt confirmed) and by
 * the daily cron for the timers. Never throws to the caller.
 */

import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../utils/db';
import { env } from '../../utils/env';
import { logger, toErrorMeta } from '../../utils/logger';
import { downloadFile } from '../../utils/s3';
import { documents, users } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import {
  payoutDecisions,
  payoutReleases,
  type PayoutAccount,
} from '../../drizzle/schema/payout';
import { payoutLines } from '../../drizzle/schema/payout-queue';
import {
  payoutEmailLog,
  payoutTasks,
  type PayoutTaskKind,
} from '../../drizzle/schema/payout-emails';
import { claimCase } from '../client-updates/case-columns';
import { formatLongDate } from '../client-updates/schedule';
import { sendTaskNoticeEmail } from '../client-updates/emails/send';
import { isDirectDrvRefund } from '../drv-pack/route';
import { PayoutAccountsService } from '../payout-accounts';
import { OpsSettingsService } from '../ops-settings';
import { todayBerlin, type IsoDate } from '../payout-flow/deadlines';
import {
  renderPayoutEmailHtml,
  renderPayoutEmailText,
} from '../gpr-payout/email-templates/layout';
import {
  planPayoutActions,
  type PlannedAction,
  type PlannerCase,
  type PlannerRelease,
} from './planner';
import {
  missingFields,
  payoutEmail,
  PAYOUT_TEMPLATE_VERSION,
  PRODUCT_FIELDS,
  type PayoutEmailVars,
  type PayoutProduct,
} from './templates';
import { senderIdentity } from './signers';
import { sendRawPayoutEmail, type RawMailAttachment } from './send';

type ClaimRow = typeof claimsTable.$inferSelect;
type ReleaseRow = typeof payoutReleases.$inferSelect;
type DecisionRow = typeof payoutDecisions.$inferSelect;

const berlinDate = (d: Date | null | undefined): IsoDate | null =>
  d ? todayBerlin(d) : null;

export function productOf(claim: Pick<ClaimRow, 'caseType'>): PayoutProduct {
  return claim.caseType === 'bav_cashout' ? 'bav' : 'gpr';
}

/** "€4,256.50"; other currencies with their ISO code. */
export function formatMoney(amount: number, currency = 'EUR'): string {
  const c = currency.toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: c,
      currencyDisplay: c === 'EUR' ? 'symbol' : 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/ /g, ' ');
  } catch {
    return `${c} ${amount.toFixed(2)}`;
  }
}

/** Last four characters of the account, when there is one. */
export function accountEnding(account: PayoutAccount | null): string | null {
  const raw = (account?.iban || account?.accountNumber || '').replace(
    /\s+/g,
    ''
  );
  return raw.length >= 4 ? raw.slice(-4) : null;
}

function adminClaimUrl(claimId: string): string {
  return `${env.ADMIN_URL.replace(/\/$/, '')}/claims/${claimId}`;
}

function accountBase(): string {
  const base = (process.env.GPR_FRONTEND_URL || env.FRONTEND_URL).replace(
    /\/$/,
    ''
  );
  return `${base}/account`;
}

export const PAYOUT_TASK_LABELS: Record<PayoutTaskKind, string> = {
  missing_funds: 'Funds missing after the decision',
  missing_decision: 'Decision missing after the funds',
  review_late_document: 'Review due soon: decision received late',
  review_overdue: 'Decision review overdue',
  review_issue: 'Client reported an issue with the decision',
  no_signature: 'No payment instruction 30 days after the invitation',
  transfer_record_incomplete: 'Record the TransferMate onward payment',
  payment_not_received: 'Client reports the payment has not arrived',
  email_fields_missing: 'Payout e-mail blocked: data missing',
  decision_upload: 'Client uploaded a decision: verify and publish',
};

interface Snapshot {
  claim: ClaimRow;
  manager: string | null;
  managerEmail: string | null;
  email: string | null;
  decision: DecisionRow | null;
  releases: ReleaseRow[];
  lines: Map<string, typeof payoutLines.$inferSelect>;
  plan: PlannerCase;
}

export class PayoutEmailService {
  /** Plan and execute for one case. Never throws. */
  static async run(
    claimId: string,
    now: Date = new Date()
  ): Promise<PlannedAction[]> {
    try {
      const snap = await this.snapshot(claimId, now);
      if (!snap) return [];
      const actions = planPayoutActions(snap.plan);
      for (const a of actions) {
        try {
          if (a.kind === 'task') await this.openTask(snap, a);
          else await this.sendEmail(snap, a);
        } catch (error) {
          logger.error('Payout e-mails: action failed', {
            claimId,
            key: a.key,
            ...toErrorMeta(error),
          });
        }
      }
      return actions;
    } catch (error) {
      logger.error('Payout e-mails: run failed', {
        claimId,
        ...toErrorMeta(error),
      });
      return [];
    }
  }

  /** Daily timers: every case with payout activity not yet completed. */
  static async runDaily(now: Date = new Date()): Promise<{
    cases: number;
    emails: number;
    tasks: number;
  }> {
    const fromDecisions = await db
      .selectDistinct({ claimId: payoutDecisions.claimId })
      .from(payoutDecisions);
    const fromReleases = await db
      .selectDistinct({ claimId: payoutReleases.claimId })
      .from(payoutReleases)
      .where(
        or(
          isNull(payoutReleases.receiptStatus),
          eq(payoutReleases.status, 'open')
        )
      );
    const ids = [
      ...new Set([...fromDecisions, ...fromReleases].map((r) => r.claimId)),
    ];
    let emails = 0;
    let tasks = 0;
    for (const id of ids) {
      const done = await this.run(id, now);
      emails += done.filter((a) => a.kind === 'email').length;
      tasks += done.filter((a) => a.kind === 'task').length;
    }
    return { cases: ids.length, emails, tasks };
  }

  // ---------------- snapshot ----------------

  static async snapshot(
    claimId: string,
    now: Date = new Date()
  ): Promise<Snapshot | null> {
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);
    if (!claim) return null;
    // Direct client submission: the payer pays the client, no escrow.
    if (isDirectDrvRefund(claim)) return null;
    const [cc] = await db
      .select({
        owner: claimCase.communicationOwner,
        ownerEmail: claimCase.communicationOwnerEmail,
      })
      .from(claimCase)
      .where(eq(claimCase.id, claimId))
      .limit(1);
    const [u] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, claim.userId))
      .limit(1);
    const decisions = await db
      .select()
      .from(payoutDecisions)
      .where(eq(payoutDecisions.claimId, claimId))
      .orderBy(desc(payoutDecisions.createdAt));
    const published = decisions.find((d) => d.publishedAt) ?? null;
    const pendingUpload = decisions.some(
      (d) => !d.publishedAt && d.source === 'client_upload'
    );
    const releases = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.claimId, claimId))
      .orderBy(asc(payoutReleases.createdAt));
    const lineRows = releases.length
      ? await db
          .select()
          .from(payoutLines)
          .where(
            and(
              inArray(
                payoutLines.payoutReleaseId,
                releases.map((r) => r.id)
              ),
              eq(payoutLines.kind, 'client')
            )
          )
      : [];
    const lines = new Map(lineRows.map((l) => [l.payoutReleaseId, l]));
    const queuedIds = new Set(
      releases.length
        ? (
            await db
              .selectDistinct({ id: payoutLines.payoutReleaseId })
              .from(payoutLines)
              .where(
                inArray(
                  payoutLines.payoutReleaseId,
                  releases.map((r) => r.id)
                )
              )
          ).map((r) => r.id)
        : []
    );
    const sentRows = await db
      .select({ key: payoutEmailLog.eventKey })
      .from(payoutEmailLog)
      .where(eq(payoutEmailLog.claimId, claimId));
    const atlaesIban = (await PayoutAccountsService.get('atlaes'))?.iban;
    const product = productOf(claim);
    const timers = (await OpsSettingsService.payoutTimers())[product];
    const today = todayBerlin(now);

    const plannerReleases: PlannerRelease[] = releases.map((r) => {
      const line = lines.get(r.id);
      return {
        id: r.id,
        status: r.status as PlannerRelease['status'],
        fundsRecordedOn: berlinDate(r.fundsRecordedAt) ?? r.valueDate,
        invitedOn: berlinDate(r.invitedAt),
        signable: !!(r.invoiceNumber && claim.lawFirmRef && atlaesIban),
        route: (r.route as PlannerRelease['route']) ?? null,
        queued: queuedIds.has(r.id),
        clientLinePaidOn:
          line?.status === 'paid' ? (line.paidOn ?? null) : null,
        onward: {
          transferDate: r.onwardTransferDate ?? null,
          hasReceipt: !!r.onwardReceiptDocumentId,
          expectedArrival:
            r.route === 'B' ? (r.expectedArrivalDate ?? null) : null,
        },
        expectedArrival:
          r.route === 'B' ? null : (r.expectedArrivalDate ?? null),
        receiptStatus:
          (r.receiptStatus as PlannerRelease['receiptStatus']) ?? null,
      };
    });

    const contactPaused =
      !!claim.contactPausedAt &&
      (!claim.nextContactDate || today < claim.nextContactDate);

    return {
      claim,
      manager: cc?.owner ?? null,
      managerEmail: cc?.ownerEmail ?? null,
      email: u?.email ?? null,
      decision: published,
      releases,
      lines,
      plan: {
        claimId,
        product,
        today,
        decision: published
          ? {
              id: published.id,
              atlaesReceivedAt:
                published.atlaesReceivedAt ?? published.receivedAt,
              reviewBy: published.clientReviewBy,
              reviewOutcome:
                (published.reviewOutcome as 'confirmed' | 'disputed' | null) ??
                null,
            }
          : null,
        pendingUpload,
        releases: plannerReleases,
        payoutHold: !!claim.payoutHoldAt,
        contactPaused,
        decisionDirectToClient: !!claim.decisionDirectToClientAt,
        sent: new Set(sentRows.map((r) => r.key)),
        timers,
      },
    };
  }

  // ---------------- tasks ----------------

  /** Open an admin task once per dedupe key; notify ops on creation. */
  static async openTask(
    snap: Pick<Snapshot, 'claim' | 'managerEmail'>,
    a: {
      task: PayoutTaskKind;
      key: string;
      releaseId: string | null;
      urgent: boolean;
      detail: string;
    }
  ): Promise<boolean> {
    const [row] = await db
      .insert(payoutTasks)
      .values({
        claimId: snap.claim.id,
        releaseId: a.releaseId,
        kind: a.task,
        dedupeKey: a.key,
        urgent: a.urgent,
        detail: a.detail,
      })
      .onConflictDoNothing({ target: payoutTasks.dedupeKey })
      .returning({ id: payoutTasks.id });
    if (!row) return false;
    const name =
      [snap.claim.firstName, snap.claim.lastName].filter(Boolean).join(' ') ||
      snap.claim.id.slice(0, 8);
    await sendTaskNoticeEmail({
      to: snap.managerEmail,
      subject: `${a.urgent ? 'Urgent: ' : ''}${PAYOUT_TASK_LABELS[a.task]} — ${name}`,
      lines: [a.detail],
      caseUrl: adminClaimUrl(snap.claim.id),
    }).catch(() => false);
    return true;
  }

  // ---------------- e-mails ----------------

  private static async sendEmail(
    snap: Snapshot,
    a: Extract<PlannedAction, { kind: 'email' }>
  ): Promise<boolean> {
    const { claim } = snap;
    if (!snap.email) return false;
    const product = snap.plan.product;
    const release = a.releaseId
      ? (snap.releases.find((r) => r.id === a.releaseId) ?? null)
      : (snap.releases.find((r) => r.status === 'open') ?? null);
    const sender = senderIdentity(product, snap.manager);
    const reviews =
      a.template === 'E5'
        ? (await OpsSettingsService.payoutReviews())[product]
        : null;
    // Review invitation only where destinations are configured.
    const inviteReview =
      !!a.inviteReview &&
      !!reviews &&
      (reviews.links.length > 0 || !!reviews.trustpilotBcc);
    const vars = this.vars(snap, a, release, sender.hasManager, {
      inviteReview,
      reviewLinks: reviews?.links ?? [],
      trustpilotInvite: inviteReview && !!reviews?.trustpilotBcc,
    });
    const missing = missingFields(a.template, vars);
    let attachments: RawMailAttachment[] = [];
    if (a.template === 'E4B' && release?.onwardReceiptDocumentId) {
      const file = await this.receiptAttachment(
        claim.id,
        release.onwardReceiptDocumentId
      );
      if (file) attachments = [file];
      else missing.push('transfer receipt');
    }
    if (missing.length) {
      await this.openTask(snap, {
        task: 'email_fields_missing',
        key: `fields:${a.key}`,
        releaseId: a.releaseId,
        urgent: false,
        detail: `${a.template} was not sent: ${missing.join(', ')} missing. Complete the record; the e-mail goes out on the next run.`,
      });
      return false;
    }

    // Claim the event key before sending: a parallel run or a repeated
    // event finds it taken.
    const [claimed] = await db
      .insert(payoutEmailLog)
      .values({
        claimId: claim.id,
        releaseId: a.releaseId,
        template: a.template,
        eventKey: a.key,
        templateVersion: PAYOUT_TEMPLATE_VERSION,
        recipient: snap.email,
        bcc: inviteReview ? (reviews?.trustpilotBcc ?? null) : null,
      })
      .onConflictDoNothing({ target: payoutEmailLog.eventKey })
      .returning({ id: payoutEmailLog.id });
    if (!claimed) return false;

    const parts = payoutEmail(a.template, vars);
    const content = {
      subject: parts.subject,
      preheader: parts.preheader,
      blocks: parts.blocks,
      closing: '',
      signature: '',
      signer: sender.signer,
      brand: PRODUCT_FIELDS[product].brand,
    };
    const ok = await sendRawPayoutEmail({
      fromName: sender.fromName,
      to: snap.email,
      bcc: inviteReview ? (reviews?.trustpilotBcc ?? null) : null,
      replyTo: snap.managerEmail,
      subject: parts.subject,
      html: renderPayoutEmailHtml(content),
      text: renderPayoutEmailText(content),
      attachments,
    });
    if (!ok) {
      // Free the key so the next run retries.
      await db.delete(payoutEmailLog).where(eq(payoutEmailLog.id, claimed.id));
      return false;
    }
    const now = new Date();
    await db
      .update(payoutEmailLog)
      .set({ status: 'sent', sentAt: now })
      .where(eq(payoutEmailLog.id, claimed.id));
    const markers = inviteReview
      ? a.alsoKeys
      : a.alsoKeys.filter((k) => !k.startsWith('REVIEWINV:'));
    if (markers.length) {
      await db
        .insert(payoutEmailLog)
        .values(
          markers.map((k) => ({
            claimId: claim.id,
            releaseId: a.releaseId,
            template: 'mark',
            eventKey: k,
            templateVersion: PAYOUT_TEMPLATE_VERSION,
            recipient: snap.email!,
            status: 'settled',
            sentAt: now,
          }))
        )
        .onConflictDoNothing({ target: payoutEmailLog.eventKey });
    }
    if (a.marksInvitation && release && !release.invitedAt) {
      await db
        .update(payoutReleases)
        .set({ invitedAt: now, updatedAt: now })
        .where(eq(payoutReleases.id, release.id));
    }
    return true;
  }

  private static vars(
    snap: Snapshot,
    a: Extract<PlannedAction, { kind: 'email' }>,
    release: ReleaseRow | null,
    hasManager: boolean,
    e5: Pick<
      PayoutEmailVars,
      'inviteReview' | 'reviewLinks' | 'trustpilotInvite'
    >
  ): PayoutEmailVars {
    const { claim, decision } = snap;
    const base = accountBase();
    const line = release ? snap.lines.get(release.id) : undefined;
    const account = (release?.account as PayoutAccount | null) ?? null;
    return {
      product: snap.plan.product,
      firstName: claim.firstName || 'there',
      amountReceived: release
        ? formatMoney(Number(release.amountReceivedEur))
        : undefined,
      reviewDeadline:
        decision && !a.reviewOverdue
          ? formatLongDate(decision.clientReviewBy)
          : null,
      links: {
        review: `${base}/payout/review`,
        payout: `${base}/payout/release`,
        decisionUpload: `${base}/payout/decision`,
        receipt: `${base}/payout/receipt`,
      },
      hasManager,
      amountSent: line ? formatMoney(Number(line.amount)) : undefined,
      transferDate: line?.paidOn ? formatLongDate(line.paidOn) : undefined,
      bankName: account?.bank || null,
      accountEnding: accountEnding(account),
      finalAmount:
        release?.onwardAmount && release.onwardCurrency
          ? formatMoney(Number(release.onwardAmount), release.onwardCurrency)
          : undefined,
      onwardTransferDate: release?.onwardTransferDate
        ? formatLongDate(release.onwardTransferDate)
        : undefined,
      expectedArrival: release?.expectedArrivalDate
        ? formatLongDate(release.expectedArrivalDate)
        : undefined,
      receiptConfirmed: release?.receiptStatus === 'confirmed',
      ...e5,
    };
  }

  /** The receipt stored on this case (a file of another case never). */
  private static async receiptAttachment(
    claimId: string,
    documentId: string
  ): Promise<RawMailAttachment | null> {
    const [doc] = await db
      .select()
      .from(documents)
      .innerJoin(claimsTable, eq(claimsTable.userId, documents.userId))
      .where(and(eq(documents.id, documentId), eq(claimsTable.id, claimId)))
      .limit(1);
    if (!doc) return null;
    try {
      return {
        fileName: doc.documents.fileName,
        contentType: doc.documents.fileType,
        bytes: await downloadFile(doc.documents.s3Key),
      };
    } catch (error) {
      logger.error('Payout e-mails: receipt download failed', {
        claimId,
        ...toErrorMeta(error),
      });
      return null;
    }
  }

  // ---------------- admin views ----------------

  static async log(claimId: string) {
    return db
      .select()
      .from(payoutEmailLog)
      .where(
        and(
          eq(payoutEmailLog.claimId, claimId),
          sql`${payoutEmailLog.template} <> 'mark'`
        )
      )
      .orderBy(desc(payoutEmailLog.createdAt));
  }

  static async tasks(filter: { claimId?: string; open?: boolean } = {}) {
    const where = and(
      filter.claimId ? eq(payoutTasks.claimId, filter.claimId) : undefined,
      filter.open ? eq(payoutTasks.status, 'open') : undefined
    );
    return db
      .select({
        task: payoutTasks,
        firstName: claimsTable.firstName,
        lastName: claimsTable.lastName,
      })
      .from(payoutTasks)
      .innerJoin(claimsTable, eq(claimsTable.id, payoutTasks.claimId))
      .where(where)
      .orderBy(desc(payoutTasks.urgent), asc(payoutTasks.createdAt));
  }

  static async resolveTask(
    taskId: string,
    actorId: string,
    note: string | null
  ): Promise<boolean> {
    const [row] = await db
      .update(payoutTasks)
      .set({
        status: 'done',
        resolvedAt: new Date(),
        resolvedBy: actorId,
        resolutionNote: note,
      })
      .where(and(eq(payoutTasks.id, taskId), eq(payoutTasks.status, 'open')))
      .returning({ id: payoutTasks.id });
    return !!row;
  }
}
