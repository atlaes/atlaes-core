/**
 * Client review-and-release payout flow (platform brief 2026-09-16,
 * Part 2 §2–§4; Figma section B screens 08–13).
 *
 * Events (either can come first; review never blocks release):
 *  - E2 "Bescheid received" → `recordDecision` (admin upload + OCR) →
 *    `onDecisionRecorded`: review task in the client account.
 *  - E1 "Funds received" → `onFundsRecorded` (called by the law firm's
 *    statement upload, stream P3, or the admin fallback endpoint): fee
 *    split frozen, release task in the client account.
 *
 * Release: bank details (prefilled from intake, validated per country) →
 * route (non-EUR only, text F) → drawn signature → Zahlungserklärung PDF
 * (D + E, gpr-payout/zahlungserklaerung.ts) stored on the case; the claim
 * gets `payout_released_at` and enters the law-firm payout queue.
 *
 * Queue contract for stream P3 (see migration 0020):
 *   claims.claims.payout_released_at IS NOT NULL
 *   AND claims.claims.payout_details_review_required = false
 *   → lines from claims.payout_releases WHERE status = 'signed'
 *     (atlaes_share_eur → ATLAES IBAN with invoice_number; client_amount_eur
 *     → account / route; ze_document_id + ze_s3_key = the signed ZE).
 */

import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { db } from '../../utils/db';
import { logger, toErrorMeta } from '../../utils/logger';
import { getPresignedUrl, uploadFile, downloadFile } from '../../utils/s3';
import { auditLogs, documents, users } from '../../drizzle/schema/shared';
import { claimDocuments, claimsTable } from '../../drizzle/schema/claims';
import {
  payoutCustomerInputs,
  payoutDecisions,
  payoutReleases,
  type PayoutAccount,
  type PayoutDecisionPeriod,
  type PayoutReviewReason,
  type PayoutRouteChoiceLog,
} from '../../drizzle/schema/payout';
import { computeFeeSplit } from '../drv-pack/fee';
import { extractDrvRefundDecisionDetails } from '../drv-refund-decision-extraction';
import {
  buildZahlungserklaerungText,
  renderZahlungserklaerung,
  type ZahlungserklaerungInput,
  type ZahlungserklaerungText,
} from '../gpr-payout/zahlungserklaerung';
import { payoutNotification } from '../gpr-payout/notifications';
import { sendPayoutNotificationEmail } from '../gpr-payout/email-templates/send';
import { sendOpsLawFirmActivityEmail } from '../email';
import { sendClientUpdateEmail } from '../client-updates/emails/send';
import { accountUrl, adminCaseUrl } from '../client-updates';
import {
  atlaesIban,
  payoutFeeConfig,
  ROUTE_DISCLOSURE_VERSION,
} from './config';
import { isIsoDate, reviewDates, todayBerlin, type IsoDate } from './deadlines';
import { buildFeePanel, SMALL_REFUND_FLAG, type FeePanel } from './fee-panel';
import {
  buildRouteOptions,
  routeForOption,
  type PayoutRouteCode,
  type RouteOptions,
} from './providers';
import { ecbReferenceRate } from './ecb';
import { parsePeriodsFromOcr } from './periods';
import { reviewReasons } from './review-flags';
import {
  countryCode,
  validateBankDetails,
  type BankDetailsInput,
  type BankValidationResult,
} from './bank-validation';

export interface Actor {
  id: string;
  email?: string;
}

export class PayoutFlowError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 400,
    readonly code?: string
  ) {
    super(message);
    this.name = 'PayoutFlowError';
  }
}

type ClaimRow = typeof claimsTable.$inferSelect;
type DecisionRow = typeof payoutDecisions.$inferSelect;
type ReleaseRow = typeof payoutReleases.$inferSelect;

const n = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);

const MAX_UPLOAD = 10 * 1024 * 1024;
const UPLOAD_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

function checkUpload(file: File): void {
  if (file.size > MAX_UPLOAD)
    throw new PayoutFlowError(`${file.name}: file size exceeds 10MB`);
  if (!UPLOAD_TYPES.includes(file.type))
    throw new PayoutFlowError(`${file.name}: only PDF, JPG or PNG files`);
}

/** Date whose local fields show Europe/Berlin wall-clock time (for the ZE). */
export function berlinWallClock(d: Date): Date {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return new Date(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  );
}

function documentNumber(now = new Date()): string {
  return `ZE-${now.getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function claimantName(
  c: Pick<ClaimRow, 'firstName' | 'lastName' | 'id'>
): string {
  return (
    [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
    c.id.slice(0, 8)
  );
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export interface DecisionView {
  id: string;
  receivedAt: IsoDate;
  decisionDate: IsoDate | null;
  office: string | null;
  refundAmountEur: number | null;
  periods: PayoutDecisionPeriod[];
  objectionDeadline: IsoDate;
  clientReviewBy: IsoDate;
  reviewOutcome: string | null;
  reviewedAt: string | null;
  hasDocument: boolean;
  pageCount: number | null;
}

export interface ReleaseView {
  id: string;
  status: string;
  valueDate: IsoDate;
  amountReceivedEur: number;
  panel: FeePanel;
  account: PayoutAccount | null;
  /** Intake bank details (prefill when `account` is null). */
  prefill: PayoutAccount;
  route: PayoutRouteCode | null;
  routeChoice: PayoutRouteChoiceLog | null;
  reviewRequired: boolean;
  signedAt: string | null;
  zeDocumentNumber: string | null;
  blockers: string[];
}

export interface ClientPayoutTask {
  kind: 'review_decision' | 'release_refund';
  id: string;
  title: string;
  dueDate: IsoDate | null;
  href: string;
}

export interface ClientPayoutState {
  claimId: string;
  client: { firstName: string | null; lastName: string | null };
  tasks: ClientPayoutTask[];
  decision: DecisionView | null;
  release: ReleaseView | null;
  /** Latest missing-period report (screen 09 "after submitting"). */
  report: { id: string; createdAt: string | null; status: string } | null;
}

function decisionView(d: DecisionRow): DecisionView {
  const ext = (d.extraction ?? {}) as { pageCount?: number };
  return {
    id: d.id,
    receivedAt: d.receivedAt,
    decisionDate: d.decisionDate ?? null,
    office: d.office ?? null,
    refundAmountEur: n(d.refundAmountEur),
    periods: (d.periods ?? []) as PayoutDecisionPeriod[],
    objectionDeadline: d.objectionDeadline,
    clientReviewBy: d.clientReviewBy,
    reviewOutcome: d.reviewOutcome ?? null,
    reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
    hasDocument: !!d.documentId,
    pageCount: typeof ext.pageCount === 'number' ? ext.pageCount : null,
  };
}

function intakeAccount(c: ClaimRow): PayoutAccount {
  const country = countryCode(c.bankCountry) ?? '';
  return {
    accountHolder:
      c.accountHolderName ||
      [c.firstName, c.lastName].filter(Boolean).join(' '),
    bank: c.bankName ?? '',
    country,
    currency: (c.preferredCurrency || (c.iban ? 'EUR' : '')).toUpperCase(),
    iban: c.iban ?? null,
    bic: c.swiftBic ?? null,
    accountNumber: c.accountNumber ?? null,
    routingLabel: c.bsb ? 'BSB' : null,
    routingValue: c.bsb ?? null,
  };
}

function signingBlockers(c: ClaimRow, r: ReleaseRow): string[] {
  const out: string[] = [];
  if (!r.account) out.push('bank_details_missing');
  if (!r.route) out.push('route_missing');
  if (!r.invoiceNumber) out.push('invoice_missing');
  if (!c.lawFirmRef) out.push('aktenzeichen_missing');
  if (!atlaesIban()) out.push('atlaes_iban_missing');
  return out;
}

function releaseView(c: ClaimRow, r: ReleaseRow): ReleaseView {
  const cfg = payoutFeeConfig();
  return {
    id: r.id,
    status: r.status,
    valueDate: r.valueDate,
    amountReceivedEur: Number(r.amountReceivedEur),
    panel: buildFeePanel(Number(r.amountReceivedEur), cfg),
    account: (r.account as PayoutAccount | null) ?? null,
    prefill: intakeAccount(c),
    route: (r.route as PayoutRouteCode | null) ?? null,
    routeChoice: (r.routeChoice as PayoutRouteChoiceLog | null) ?? null,
    reviewRequired: r.reviewRequired,
    signedAt: r.signedAt ? r.signedAt.toISOString() : null,
    zeDocumentNumber: r.zeDocumentNumber ?? null,
    blockers: r.status === 'open' ? signingBlockers(c, r) : [],
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PayoutFlowService {
  // ---------------- lookups ----------------

  static async getClaim(claimId: string): Promise<ClaimRow> {
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);
    if (!row) throw new PayoutFlowError('Claim not found', 404);
    return row;
  }

  /** The client's current (non-draft) claim, as the account area resolves it. */
  static async claimForUser(userId: string): Promise<ClaimRow> {
    const rows = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.userId, userId))
      .orderBy(desc(claimsTable.updatedAt));
    const row = rows.find((r) => r.status !== 'draft');
    if (!row) throw new PayoutFlowError('No application found', 404);
    return row;
  }

  private static async latestDecision(
    claimId: string
  ): Promise<DecisionRow | null> {
    const [d] = await db
      .select()
      .from(payoutDecisions)
      .where(eq(payoutDecisions.claimId, claimId))
      .orderBy(desc(payoutDecisions.createdAt))
      .limit(1);
    return d ?? null;
  }

  private static async releases(claimId: string): Promise<ReleaseRow[]> {
    return db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.claimId, claimId))
      .orderBy(asc(payoutReleases.createdAt));
  }

  /** Oldest open release, else the latest signed one. */
  private static currentRelease(rows: ReleaseRow[]): ReleaseRow | null {
    return (
      rows.find((r) => r.status === 'open') ??
      [...rows].reverse().find((r) => r.status === 'signed') ??
      null
    );
  }

  private static async releaseForUser(
    userId: string,
    releaseId: string
  ): Promise<{ claim: ClaimRow; release: ReleaseRow }> {
    const claim = await this.claimForUser(userId);
    const [release] = await db
      .select()
      .from(payoutReleases)
      .where(
        and(
          eq(payoutReleases.id, releaseId),
          eq(payoutReleases.claimId, claim.id)
        )
      )
      .limit(1);
    if (!release) throw new PayoutFlowError('Release not found', 404);
    return { claim, release };
  }

  private static async decisionForUser(
    userId: string,
    decisionId: string
  ): Promise<{ claim: ClaimRow; decision: DecisionRow }> {
    const claim = await this.claimForUser(userId);
    const [decision] = await db
      .select()
      .from(payoutDecisions)
      .where(
        and(
          eq(payoutDecisions.id, decisionId),
          eq(payoutDecisions.claimId, claim.id)
        )
      )
      .limit(1);
    if (!decision) throw new PayoutFlowError('Decision not found', 404);
    return { claim, decision };
  }

  private static async audit(
    actor: Actor | null,
    action: string,
    claimId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await db.insert(auditLogs).values({
      userId: actor?.id ?? null,
      action,
      resource: 'claim',
      resourceId: claimId,
      details,
    });
  }

  private static async storeFile(
    claim: ClaimRow,
    folder: string,
    file: { name: string; type: string; bytes: Buffer },
    documentType: string,
    role: string | null
  ): Promise<string> {
    const ext = file.name.split('.').pop() || 'bin';
    const s3Key = `claims/${claim.id}/payout/${folder}/${randomUUID()}.${ext}`;
    await uploadFile(s3Key, file.bytes, file.type);
    const [doc] = await db
      .insert(documents)
      .values({
        userId: claim.userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.bytes.length,
        s3Key,
        documentType,
        status: 'completed',
      })
      .returning();
    if (role) {
      await db
        .insert(claimDocuments)
        .values({ claimId: claim.id, documentId: doc.id, documentRole: role });
    }
    return doc.id;
  }

  // ---------------- events (E1 / E2) ----------------

  /**
   * E2 recorded (admin upload or another stream). Feeds the client-update
   * engine, checks the OCR amount against received funds, and sends
   * A2/A3 where they apply. Non-throwing for the hooks.
   */
  static async onDecisionRecorded(
    claimId: string,
    input: { decisionId?: string | null; receivedAt: IsoDate },
    actor: Actor | null = null
  ): Promise<void> {
    try {
      const { ClientUpdatesService } = await import('../client-updates');
      await ClientUpdatesService.onDecision(
        claimId,
        new Date(`${input.receivedAt}T12:00:00Z`),
        actor ? { id: actor.id, email: actor.email ?? '' } : null
      );
    } catch (error) {
      logger.error('Payout: client-update decision hook failed', {
        claimId,
        ...toErrorMeta(error),
      });
    }
    await this.checkAmountMismatch(claimId).catch((error) =>
      logger.error('Payout: amount check failed', {
        claimId,
        ...toErrorMeta(error),
      })
    );
    await this.dispatchNotifications(claimId).catch((error) =>
      logger.error('Payout: notification failed', {
        claimId,
        ...toErrorMeta(error),
      })
    );
  }

  /**
   * E1: a statement line was matched to the case (stream P3) or ops
   * recorded the funds. Amount and value date are authoritative. Creates
   * the release (fee split frozen), flags small refunds for the annual
   * settlement, feeds the client-update engine, sends A1/A3.
   */
  static async onFundsRecorded(
    claimId: string,
    input: {
      amountEur: number;
      valueDate: IsoDate;
      statementReference?: string | null;
    },
    actor: Actor | null = null
  ): Promise<ReleaseRow> {
    if (!(input.amountEur > 0))
      throw new PayoutFlowError('Amount must be positive');
    if (!isIsoDate(input.valueDate))
      throw new PayoutFlowError('Invalid value date');
    const claim = await this.getClaim(claimId);
    const split = computeFeeSplit(input.amountEur, payoutFeeConfig());
    const [release] = await db
      .insert(payoutReleases)
      .values({
        claimId,
        amountReceivedEur: split.amountReceived.toFixed(2),
        valueDate: input.valueDate,
        statementReference: input.statementReference ?? null,
        feeEur: split.fee.toFixed(2),
        feeCapped: split.capped,
        smallRefund: split.smallRefund,
        lawFirmFeeEur: split.lawFirmFee.toFixed(2),
        atlaesShareEur: split.atlaesShare.toFixed(2),
        clientAmountEur: split.clientAmount.toFixed(2),
      })
      .returning();
    await db
      .update(claimsTable)
      .set({ payoutSmallRefund: split.smallRefund, updatedAt: new Date() })
      .where(eq(claimsTable.id, claimId));
    await this.audit(actor, 'payout_funds_recorded', claimId, {
      releaseId: release.id,
      valueDate: input.valueDate,
      ...split,
      flags: split.smallRefund ? [SMALL_REFUND_FLAG] : [],
    });
    try {
      const { ClientUpdatesService } = await import('../client-updates');
      await ClientUpdatesService.onFundsReceived(
        claimId,
        new Date(`${input.valueDate}T12:00:00Z`),
        actor ? { id: actor.id, email: actor.email ?? '' } : null
      );
    } catch (error) {
      logger.error('Payout: client-update funds hook failed', {
        claimId,
        ...toErrorMeta(error),
      });
    }
    await this.checkAmountMismatch(claimId).catch((error) =>
      logger.error('Payout: amount check failed', {
        claimId,
        ...toErrorMeta(error),
      })
    );
    await this.dispatchNotifications(claimId).catch((error) =>
      logger.error('Payout: notification failed', {
        claimId,
        ...toErrorMeta(error),
      })
    );
    logger.info('Payout funds recorded', {
      claimId: claim.id,
      releaseId: release.id,
      smallRefund: split.smallRefund,
    });
    return release;
  }

  /** OCR amount ≠ received amount → non-blocking admin flag. */
  private static async checkAmountMismatch(claimId: string): Promise<void> {
    const decision = await this.latestDecision(claimId);
    const rows = await this.releases(claimId);
    if (!decision || !rows.length || decision.refundAmountEur === null) return;
    const received = rows.reduce((s, r) => s + Number(r.amountReceivedEur), 0);
    const mismatch =
      Math.abs(received - Number(decision.refundAmountEur)) >= 0.005;
    const claim = await this.getClaim(claimId);
    if (claim.payoutAmountMismatch === mismatch) return;
    await db
      .update(claimsTable)
      .set({ payoutAmountMismatch: mismatch, updatedAt: new Date() })
      .where(eq(claimsTable.id, claimId));
    if (mismatch) {
      await sendOpsLawFirmActivityEmail({
        subject: `Amount mismatch: ${claimantName(claim)}`,
        summary: `The decision amount for ${claimantName(claim)} differs from the funds received.`,
        detailLines: [
          `Decision (OCR/admin): €${Number(decision.refundAmountEur).toFixed(2)}.`,
          `Received in escrow: €${received.toFixed(2)}.`,
          'Non-blocking: release and payout continue on the received amount.',
        ],
        claimUrl: adminCaseUrl(claimId),
      }).catch(() => false);
    }
  }

  /**
   * A1/A2/A3 (stream P5 templates), once per event. A3 when a decision and
   * funds are both new with nothing sent yet; A1 for funds with no
   * decision on file; A2 for a decision with no funds on file. A second
   * event after the first was already notified has no template in the
   * brief — logged (notified_kind 'none'); the account task still appears.
   */
  private static async dispatchNotifications(claimId: string): Promise<void> {
    const claim = await this.getClaim(claimId);
    const decision = await this.latestDecision(claimId);
    const rows = await this.releases(claimId);
    const release = rows.find((r) => r.status === 'open') ?? null;
    const decisionPending =
      !!decision && !decision.reviewOutcome && !decision.notifiedKind;
    const releasePending = !!release && !release.notifiedKind;
    if (!decisionPending && !releasePending) return;

    let kind: 'A1' | 'A2' | 'A3' | null = null;
    if (decisionPending && releasePending) kind = 'A3';
    else if (releasePending && !decision) kind = 'A1';
    else if (decisionPending && !rows.length) kind = 'A2';

    const mark = async (k: string) => {
      const set = { notifiedKind: k, notifiedAt: new Date() };
      if (decisionPending && decision)
        await db
          .update(payoutDecisions)
          .set(set)
          .where(eq(payoutDecisions.id, decision.id));
      if (releasePending && release)
        await db
          .update(payoutReleases)
          .set(set)
          .where(eq(payoutReleases.id, release.id));
    };

    if (!kind) {
      logger.info('Payout: no A1–A3 template for this event order', {
        claimId,
        decisionPending,
        releasePending,
      });
      await mark('none');
      return;
    }
    const [u] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, claim.userId))
      .limit(1);
    if (!u?.email) return;
    const mail = payoutNotification(kind, {
      firstName: claim.firstName || 'there',
      amountEur:
        kind === 'A2'
          ? (n(decision?.refundAmountEur) ?? 0)
          : Number(release?.amountReceivedEur ?? 0),
      reviewBy: decision
        ? new Date(`${decision.clientReviewBy}T12:00:00Z`)
        : null,
      portalUrl: `${accountUrl()}/payout`,
    });
    if (await sendPayoutNotificationEmail(u.email, mail)) await mark(kind);
  }

  // ---------------- admin: decision (E2) ----------------

  /**
   * Attach a Bescheid, run OCR, store the decision record. Admin values
   * override extracted ones. Objection deadline = receivedAt + 1 month;
   * client review-by = deadline − 7 days.
   */
  static async recordDecision(
    claimId: string,
    input: {
      file: File;
      receivedAt?: IsoDate | null;
      decisionDate?: IsoDate | null;
      office?: string | null;
      refundAmountEur?: number | null;
      periods?: PayoutDecisionPeriod[] | null;
      runExtraction?: boolean;
    },
    actor: Actor
  ): Promise<DecisionView> {
    const claim = await this.getClaim(claimId);
    checkUpload(input.file);
    const bytes = Buffer.from(await input.file.arrayBuffer());
    const documentId = await this.storeFile(
      claim,
      'bescheid',
      { name: input.file.name, type: input.file.type, bytes },
      'drv_refund_decision',
      'drv_refund_decision'
    );

    let pageCount: number | null = null;
    if (input.file.type === 'application/pdf') {
      try {
        pageCount = (
          await PDFDocument.load(bytes, { ignoreEncryption: true })
        ).getPageCount();
      } catch {
        pageCount = null;
      }
    } else pageCount = 1;

    let extraction: Record<string, unknown> | null = null;
    let extractionError: string | null = null;
    let ocrPeriods: PayoutDecisionPeriod[] = [];
    if (input.runExtraction !== false) {
      try {
        const res = await extractDrvRefundDecisionDetails({
          fileBuffer: bytes,
          fileName: input.file.name,
          mimeType: input.file.type,
        });
        ocrPeriods = parsePeriodsFromOcr(res.rawText);
        extraction = {
          details: res.details,
          confidence: res.confidence,
          missingFields: res.missingFields,
          model: res.model,
          periods: ocrPeriods,
        };
      } catch (error) {
        extractionError =
          error instanceof Error ? error.message : String(error);
        logger.warn('Payout: Bescheid extraction failed', {
          claimId,
          extractionError,
        });
      }
    }
    const details = (extraction?.details ?? {}) as {
      drvOffice?: string | null;
      decisionDate?: string | null;
      refundAmount?: string | null;
    };
    const receivedAt =
      input.receivedAt && isIsoDate(input.receivedAt)
        ? input.receivedAt
        : todayBerlin();
    const dates = reviewDates(receivedAt);
    const amount =
      input.refundAmountEur ??
      (details.refundAmount ? Number(details.refundAmount) : null);

    const [row] = await db
      .insert(payoutDecisions)
      .values({
        claimId,
        documentId,
        receivedAt,
        decisionDate: input.decisionDate ?? details.decisionDate ?? null,
        office: input.office ?? details.drvOffice ?? null,
        refundAmountEur:
          amount !== null && Number.isFinite(amount) ? amount.toFixed(2) : null,
        periods: input.periods ?? ocrPeriods,
        objectionDeadline: dates.objectionDeadline,
        clientReviewBy: dates.clientReviewBy,
        extraction: { ...(extraction ?? {}), pageCount },
        extractionError,
        createdBy: actor.id,
      })
      .returning();
    await this.audit(actor, 'payout_decision_recorded', claimId, {
      decisionId: row.id,
      documentId,
      receivedAt,
      ...dates,
      extractionError,
    });
    await this.onDecisionRecorded(
      claimId,
      { decisionId: row.id, receivedAt },
      actor
    );
    return decisionView(row);
  }

  /** Admin corrections of the extracted values. */
  static async updateDecision(
    claimId: string,
    decisionId: string,
    patch: {
      receivedAt?: IsoDate;
      decisionDate?: IsoDate | null;
      office?: string | null;
      refundAmountEur?: number | null;
      periods?: PayoutDecisionPeriod[];
    },
    actor: Actor
  ): Promise<DecisionView> {
    const [d] = await db
      .select()
      .from(payoutDecisions)
      .where(
        and(
          eq(payoutDecisions.id, decisionId),
          eq(payoutDecisions.claimId, claimId)
        )
      )
      .limit(1);
    if (!d) throw new PayoutFlowError('Decision not found', 404);
    const set: Partial<typeof payoutDecisions.$inferInsert> = {
      correctedBy: actor.id,
      correctedAt: new Date(),
      updatedAt: new Date(),
    };
    if (patch.receivedAt !== undefined) {
      if (!isIsoDate(patch.receivedAt))
        throw new PayoutFlowError('Invalid receivedAt');
      const dates = reviewDates(patch.receivedAt);
      set.receivedAt = patch.receivedAt;
      set.objectionDeadline = dates.objectionDeadline;
      set.clientReviewBy = dates.clientReviewBy;
    }
    if (patch.decisionDate !== undefined) set.decisionDate = patch.decisionDate;
    if (patch.office !== undefined) set.office = patch.office;
    if (patch.refundAmountEur !== undefined)
      set.refundAmountEur =
        patch.refundAmountEur === null
          ? null
          : patch.refundAmountEur.toFixed(2);
    if (patch.periods !== undefined) set.periods = patch.periods;
    const [row] = await db
      .update(payoutDecisions)
      .set(set)
      .where(eq(payoutDecisions.id, decisionId))
      .returning();
    await this.audit(actor, 'payout_decision_corrected', claimId, {
      decisionId,
      patch,
    });
    if (patch.refundAmountEur !== undefined)
      await this.checkAmountMismatch(claimId).catch(() => undefined);
    return decisionView(row);
  }

  static async getAdminState(claimId: string) {
    const claim = await this.getClaim(claimId);
    const [decisions, rows, inputs] = await Promise.all([
      db
        .select()
        .from(payoutDecisions)
        .where(eq(payoutDecisions.claimId, claimId))
        .orderBy(desc(payoutDecisions.createdAt)),
      this.releases(claimId),
      db
        .select()
        .from(payoutCustomerInputs)
        .where(eq(payoutCustomerInputs.claimId, claimId))
        .orderBy(desc(payoutCustomerInputs.createdAt)),
    ]);
    return {
      claimId,
      flags: {
        smallRefund: claim.payoutSmallRefund ?? false,
        detailsReviewRequired: claim.payoutDetailsReviewRequired,
        amountMismatch: claim.payoutAmountMismatch,
        releasedAt: claim.payoutReleasedAt,
      },
      decisions: decisions.map((d) => ({
        ...decisionView(d),
        extraction: d.extraction,
        extractionError: d.extractionError,
      })),
      releases: rows.map((r) => ({
        ...releaseView(claim, r),
        invoiceNumber: r.invoiceNumber,
        reviewReasons: r.reviewReasons,
        auditRecord: r.auditRecord,
      })),
      customerInputs: inputs,
    };
  }

  /** Invoicing stream / admin: Lexoffice number, required before signing. */
  static async setInvoiceNumber(
    releaseId: string,
    invoiceNumber: string,
    actor: Actor | null = null
  ): Promise<void> {
    const [r] = await db
      .update(payoutReleases)
      .set({ invoiceNumber, updatedAt: new Date() })
      .where(
        and(eq(payoutReleases.id, releaseId), eq(payoutReleases.status, 'open'))
      )
      .returning();
    if (!r) throw new PayoutFlowError('Open release not found', 404);
    await this.audit(actor, 'payout_invoice_number_set', r.claimId, {
      releaseId,
      invoiceNumber,
    });
  }

  /** ATLAES Admin cleared "payout details need review". */
  static async clearReview(releaseId: string, actor: Actor): Promise<void> {
    const [r] = await db
      .update(payoutReleases)
      .set({
        reviewRequired: false,
        reviewClearedAt: new Date(),
        reviewClearedBy: actor.id,
        updatedAt: new Date(),
      })
      .where(eq(payoutReleases.id, releaseId))
      .returning();
    if (!r) throw new PayoutFlowError('Release not found', 404);
    const others = (await this.releases(r.claimId)).filter(
      (x) => x.id !== r.id && x.reviewRequired && x.status !== 'cancelled'
    );
    if (!others.length) {
      await db
        .update(claimsTable)
        .set({ payoutDetailsReviewRequired: false, updatedAt: new Date() })
        .where(eq(claimsTable.id, r.claimId));
    }
    await this.audit(actor, 'payout_review_cleared', r.claimId, { releaseId });
  }

  static async listOpenCustomerInputs() {
    return db
      .select()
      .from(payoutCustomerInputs)
      .where(eq(payoutCustomerInputs.status, 'open'))
      .orderBy(asc(payoutCustomerInputs.objectionDeadline));
  }

  static async resolveCustomerInput(
    inputId: string,
    note: string | null,
    actor: Actor
  ): Promise<void> {
    const [r] = await db
      .update(payoutCustomerInputs)
      .set({
        status: 'done',
        resolvedAt: new Date(),
        resolvedBy: actor.id,
        resolutionNote: note,
      })
      .where(eq(payoutCustomerInputs.id, inputId))
      .returning();
    if (!r) throw new PayoutFlowError('Report not found', 404);
    await this.audit(actor, 'payout_customer_input_resolved', r.claimId, {
      inputId,
    });
  }

  // ---------------- client ----------------

  static async getClientState(userId: string): Promise<ClientPayoutState> {
    const claim = await this.claimForUser(userId);
    const decision = await this.latestDecision(claim.id);
    const rows = await this.releases(claim.id);
    const release = this.currentRelease(rows);
    const [report] = await db
      .select()
      .from(payoutCustomerInputs)
      .where(eq(payoutCustomerInputs.claimId, claim.id))
      .orderBy(desc(payoutCustomerInputs.createdAt))
      .limit(1);

    const tasks: ClientPayoutTask[] = [];
    if (decision && !decision.reviewOutcome) {
      tasks.push({
        kind: 'review_decision',
        id: decision.id,
        title: 'Review your refund decision',
        dueDate: decision.clientReviewBy,
        href: '/account/payout/review',
      });
    }
    if (release && release.status === 'open') {
      tasks.push({
        kind: 'release_refund',
        id: release.id,
        title: 'Release your refund',
        dueDate: null,
        href: '/account/payout/release',
      });
    }
    return {
      claimId: claim.id,
      client: { firstName: claim.firstName, lastName: claim.lastName },
      tasks,
      decision: decision ? decisionView(decision) : null,
      release: release ? releaseView(claim, release) : null,
      report: report
        ? {
            id: report.id,
            createdAt: report.createdAt ? report.createdAt.toISOString() : null,
            status: report.status,
          }
        : null,
    };
  }

  static async decisionDocumentUrl(
    userId: string,
    decisionId: string
  ): Promise<string | null> {
    const { decision } = await this.decisionForUser(userId, decisionId);
    if (!decision.documentId) return null;
    const [doc] = await db
      .select({ s3Key: documents.s3Key })
      .from(documents)
      .where(eq(documents.id, decision.documentId))
      .limit(1);
    return doc ? getPresignedUrl(doc.s3Key, 900) : null;
  }

  /** Option A "Confirm periods and amounts" → event "Bescheid confirmed". */
  static async confirmDecision(
    userId: string,
    decisionId: string
  ): Promise<void> {
    const { claim, decision } = await this.decisionForUser(userId, decisionId);
    if (decision.reviewOutcome)
      throw new PayoutFlowError('This review is no longer open', 409);
    await db
      .update(payoutDecisions)
      .set({
        reviewOutcome: 'confirmed',
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payoutDecisions.id, decisionId));
    await this.audit({ id: userId }, 'payout_bescheid_confirmed', claim.id, {
      decisionId,
    });
  }

  /**
   * Option B "Report missing periods or amounts" → event "Bescheid
   * disputed": customer-input record + internal ATLAES task carrying the
   * objection deadline; ops notified. No automatic objection.
   */
  static async reportMissing(
    userId: string,
    decisionId: string,
    description: string,
    files: File[]
  ): Promise<{ inputId: string }> {
    const { claim, decision } = await this.decisionForUser(userId, decisionId);
    if (decision.reviewOutcome)
      throw new PayoutFlowError('This review is no longer open', 409);
    const text = description.trim();
    if (!text)
      throw new PayoutFlowError('Please describe what is missing or wrong.');
    if (text.length > 5000)
      throw new PayoutFlowError('Description is too long.');
    if (files.length > 20)
      throw new PayoutFlowError('Too many files (max 20).');
    files.forEach(checkUpload);
    const documentIds: string[] = [];
    for (const f of files) {
      documentIds.push(
        await this.storeFile(
          claim,
          'payslips',
          {
            name: f.name,
            type: f.type,
            bytes: Buffer.from(await f.arrayBuffer()),
          },
          'payslip',
          'payslip'
        )
      );
    }
    const [input] = await db
      .insert(payoutCustomerInputs)
      .values({
        claimId: claim.id,
        decisionId,
        kind: 'missing_periods',
        description: text,
        documentIds,
        objectionDeadline: decision.objectionDeadline,
        createdBy: userId,
      })
      .returning();
    await db
      .update(payoutDecisions)
      .set({
        reviewOutcome: 'disputed',
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payoutDecisions.id, decisionId));
    await sendOpsLawFirmActivityEmail({
      subject: `Missing periods reported: ${claimantName(claim)}`,
      summary: `${claimantName(claim)} reported missing periods or amounts on the refund decision.`,
      detailLines: [
        `Objection deadline: ${decision.objectionDeadline}.`,
        `Payslips uploaded: ${documentIds.length}.`,
        `Client's description: ${text}`,
        'Review manually; no automatic objection and no promise to the client.',
      ],
      claimUrl: adminCaseUrl(claim.id),
    }).catch(() => false);
    await this.audit({ id: userId }, 'payout_bescheid_disputed', claim.id, {
      decisionId,
      inputId: input.id,
      documentIds,
      objectionDeadline: decision.objectionDeadline,
    });
    return { inputId: input.id };
  }

  /**
   * Step 1: bank details. Validated for the route the currency implies
   * (EUR → A; otherwise the local fields for B, BIC checked again when C
   * is chosen). Flags "payout details need review" and notifies the
   * registered address on a change / third-party holder / country
   * mismatch.
   */
  static async saveBankDetails(
    userId: string,
    releaseId: string,
    input: BankDetailsInput
  ): Promise<{ validation: BankValidationResult; release: ReleaseView }> {
    const { claim, release } = await this.releaseForUser(userId, releaseId);
    if (release.status !== 'open')
      throw new PayoutFlowError('This release is no longer open', 409);
    const currency = (input.currency || '').toUpperCase();
    const route: PayoutRouteCode = currency === 'EUR' ? 'A' : 'B';
    const validation = validateBankDetails(input, route);
    if (!validation.ok || !validation.account) {
      return { validation, release: releaseView(claim, release) };
    }
    const account: PayoutAccount = validation.account;
    const reasons: PayoutReviewReason[] = reviewReasons(
      {
        accountHolder: account.accountHolder,
        country: account.country,
        iban: account.iban ?? null,
        accountNumber: account.accountNumber ?? null,
        bic: account.bic ?? null,
      },
      {
        accountHolderName: claim.accountHolderName,
        iban: claim.iban,
        accountNumber: claim.accountNumber,
        swiftBic: claim.swiftBic,
        bsb: claim.bsb,
        bankCountry: claim.bankCountry,
      },
      {
        firstName: claim.firstName,
        lastName: claim.lastName,
        residenceCountry: claim.currentCountry,
        nationality: claim.nationality,
      }
    );
    const prevReasons = (release.reviewReasons ?? []) as PayoutReviewReason[];
    const changedFromLastSave =
      JSON.stringify(release.account ?? null) !== JSON.stringify(account);
    const [updated] = await db
      .update(payoutReleases)
      .set({
        account,
        accountConfirmedAt: new Date(),
        // EUR → SEPA without a choice; otherwise the route step decides.
        route: currency === 'EUR' ? 'A' : null,
        routeChoice: null,
        reviewRequired: reasons.length > 0,
        reviewReasons: reasons,
        updatedAt: new Date(),
      })
      .where(eq(payoutReleases.id, releaseId))
      .returning();
    await db
      .update(claimsTable)
      .set({
        payoutDetailsReviewRequired: reasons.length > 0,
        updatedAt: new Date(),
      })
      .where(eq(claimsTable.id, claim.id));
    await this.audit(
      { id: userId },
      'payout_bank_details_confirmed',
      claim.id,
      {
        releaseId,
        reviewReasons: reasons,
      }
    );
    if (reasons.length && (changedFromLastSave || !prevReasons.length)) {
      await this.notifyDetailsReview(claim, reasons).catch((error) =>
        logger.error('Payout: review notice failed', {
          claimId: claim.id,
          ...toErrorMeta(error),
        })
      );
    }
    return { validation, release: releaseView(claim, updated) };
  }

  private static async notifyDetailsReview(
    claim: ClaimRow,
    reasons: PayoutReviewReason[]
  ): Promise<void> {
    const [u] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, claim.userId))
      .limit(1);
    if (u?.email) {
      // Wording provisional (the brief names the notice but gives no text).
      await sendClientUpdateEmail({
        to: u.email,
        subject: 'Your payout details were updated',
        paragraphs: [
          `Hi ${claim.firstName || 'there'},`,
          'The bank details for your refund payout were just confirmed in your Germany Pension Refund account. Because they differ from the details we had on file, or the account is held by someone else or in another country, our team will review them before the transfer.',
          'If you did not make this change, please reply to this e-mail straight away.',
        ],
        fromName: 'Germany Pension Refund',
      });
    }
    await sendOpsLawFirmActivityEmail({
      subject: `Payout details need review: ${claimantName(claim)}`,
      summary: `Payout details for ${claimantName(claim)} need review before the payout queue.`,
      detailLines: reasons.map((r) => r.detail),
      claimUrl: adminCaseUrl(claim.id),
    }).catch(() => false);
  }

  /** Step 2 data: route options for the confirmed account (text F). */
  static async getRouteOptions(
    userId: string,
    releaseId: string
  ): Promise<RouteOptions> {
    const { release } = await this.releaseForUser(userId, releaseId);
    const account = release.account as PayoutAccount | null;
    if (!account)
      throw new PayoutFlowError('Confirm your bank details first', 409);
    const rate =
      account.currency === 'EUR'
        ? null
        : await ecbReferenceRate(account.currency);
    return buildRouteOptions({
      amountAvailableEur: Number(release.clientAmountEur),
      currency: account.currency,
      referenceRate: rate,
    });
  }

  /**
   * Step 2: the client's route choice, logged with what was displayed
   * (option, cost figure, estimate, reference rate + timestamp,
   * disclosure version). Option 1 for a non-EUR account means a separate
   * EUR account: the client re-enters it on step 1 (`needsEurAccount`).
   */
  static async chooseRoute(
    userId: string,
    releaseId: string,
    option: 1 | 2 | 3
  ): Promise<{
    release: ReleaseView;
    needsEurAccount: boolean;
    errors?: BankValidationResult['errors'];
  }> {
    const { claim, release } = await this.releaseForUser(userId, releaseId);
    if (release.status !== 'open')
      throw new PayoutFlowError('This release is no longer open', 409);
    const account = release.account as PayoutAccount | null;
    if (!account)
      throw new PayoutFlowError('Confirm your bank details first', 409);
    const options = await this.getRouteOptions(userId, releaseId);
    const chosen = options.options.find((o) => o.option === option);
    if (!chosen || !chosen.available)
      throw new PayoutFlowError('This payout option is not available');
    const route = routeForOption(option);
    if (route === 'A' && account.currency !== 'EUR') {
      return { release: releaseView(claim, release), needsEurAccount: true };
    }
    if (route === 'C') {
      const v = validateBankDetails(
        {
          ...account,
          iban: account.iban,
          accountNumber: account.accountNumber,
          routingNumber:
            account.routingLabel === 'Routing number'
              ? account.routingValue
              : null,
          ifsc: account.routingLabel === 'IFSC' ? account.routingValue : null,
          sortCode:
            account.routingLabel === 'Sort code' ? account.routingValue : null,
          bsb: account.routingLabel === 'BSB' ? account.routingValue : null,
          transitNumber:
            account.routingLabel === 'Transit/Institution'
              ? account.routingValue?.split('-')[0]
              : null,
          institutionNumber:
            account.routingLabel === 'Transit/Institution'
              ? account.routingValue?.split('-')[1]
              : null,
          clabe: account.country === 'MX' ? account.accountNumber : null,
        },
        'C'
      );
      if (!v.ok)
        return {
          release: releaseView(claim, release),
          needsEurAccount: false,
          errors: v.errors,
        };
    }
    const log: PayoutRouteChoiceLog = {
      option,
      route,
      currency: options.currency,
      amountAvailableEur: options.amountAvailableEur,
      costRate: chosen.costRate,
      costEur: chosen.costEur,
      estimatedTargetAmount: chosen.estimatedTargetAmount,
      referenceRate: options.referenceRate?.rate ?? null,
      referenceRateDate: options.referenceRate?.date ?? null,
      shownAt: new Date().toISOString(),
      disclosureVersion: ROUTE_DISCLOSURE_VERSION,
    };
    const [updated] = await db
      .update(payoutReleases)
      .set({ route, routeChoice: log, updatedAt: new Date() })
      .where(eq(payoutReleases.id, releaseId))
      .returning();
    await this.audit({ id: userId }, 'payout_route_chosen', claim.id, {
      releaseId,
      ...log,
    });
    return { release: releaseView(claim, updated), needsEurAccount: false };
  }

  private static zeInput(
    claim: ClaimRow,
    release: ReleaseRow,
    now: Date,
    docNumber: string
  ): ZahlungserklaerungInput {
    const account = release.account as PayoutAccount;
    return {
      firstName: claim.firstName ?? '',
      lastName: claim.lastName ?? '',
      aktenzeichen: claim.lawFirmRef ?? '[AZ]',
      amountReceivedEur: Number(release.amountReceivedEur),
      invoiceNumber: release.invoiceNumber ?? '[Rechnungsnummer]',
      atlaesIban: atlaesIban() ?? '[ATLAES-IBAN]',
      route: (release.route as PayoutRouteCode) ?? 'A',
      account: {
        accountHolder: account.accountHolder,
        bank: account.bank,
        accountNumber: account.accountNumber || account.iban || '',
        bic: account.bic ?? null,
        routingLabel: account.routingLabel ?? null,
        routingValue: account.routingValue ?? null,
        currency: account.currency,
      },
      date: berlinWallClock(now),
      signedAt: berlinWallClock(now),
      documentId: docNumber,
      feeConfig: payoutFeeConfig(),
    };
  }

  /** Screen 12 preview: the D + E text the client signs. */
  static async previewZe(
    userId: string,
    releaseId: string
  ): Promise<{ text: ZahlungserklaerungText; blockers: string[] }> {
    const { claim, release } = await this.releaseForUser(userId, releaseId);
    if (!release.account)
      throw new PayoutFlowError('Confirm your bank details first', 409);
    const text = buildZahlungserklaerungText(
      this.zeInput(claim, release, new Date(), '[ID]')
    );
    // Before signing the timestamp and signature do not exist yet; show the
    // template placeholders (Figma 12).
    const placeholder = (line: string): string =>
      line
        .replace(
          / am .+ · Dokument-ID \[ID\]$/,
          ' am [Zeitstempel] · Dokument-ID [ID]'
        )
        .replace(
          / on .+ · Document ID \[ID\]$/,
          ' on [timestamp] · Document ID [ID]'
        )
        .replace(/Unterschrift:$/, 'Unterschrift: [Unterschrift]')
        .replace(/Signature:$/, 'Signature: [signature]');
    const mapSections = (xs: typeof text.german) =>
      xs.map((sec) => ({ ...sec, lines: sec.lines.map(placeholder) }));
    return {
      text: {
        ...text,
        german: mapSections(text.german),
        english: mapSections(text.english),
      },
      blockers: signingBlockers(claim, release),
    };
  }

  /**
   * Step 3: drawn signature → ZE PDF (D + E, one signature event), stored
   * immutably on the case with its audit record; event "ZE signed"; the
   * claim enters the payout queue (`payout_released_at`).
   */
  static async sign(
    userId: string,
    releaseId: string,
    input: { signatureDataUrl: string; ip: string | null }
  ): Promise<{ release: ReleaseView; url: string | null }> {
    const { claim, release } = await this.releaseForUser(userId, releaseId);
    if (release.status !== 'open')
      throw new PayoutFlowError('This release is no longer open', 409);
    const blockers = signingBlockers(claim, release);
    if (blockers.length)
      throw new PayoutFlowError(
        'The payment instruction cannot be signed yet',
        409,
        blockers.join(',')
      );
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(
      input.signatureDataUrl || ''
    );
    if (!m) throw new PayoutFlowError('Please draw your signature');
    const png = Buffer.from(m[1], 'base64');
    if (png.length < 200 || png.length > 600 * 1024)
      throw new PayoutFlowError('Please draw your signature');

    const now = new Date();
    const docNumber = documentNumber(now);
    const zeInput = this.zeInput(claim, release, now, docNumber);
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Zahlungserklärung ${docNumber}`);
    const text = await renderZahlungserklaerung(
      pdf,
      zeInput,
      new Uint8Array(png)
    );
    const bytes = Buffer.from(await pdf.save());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const fileName = `Zahlungserklaerung-${docNumber}.pdf`;
    const s3Key = `claims/${claim.id}/payout/ze/${docNumber}.pdf`;
    await uploadFile(s3Key, bytes, 'application/pdf');
    const [doc] = await db
      .insert(documents)
      .values({
        userId: claim.userId,
        fileName,
        fileType: 'application/pdf',
        fileSize: bytes.length,
        s3Key,
        documentType: 'zahlungserklaerung',
        status: 'completed',
      })
      .returning();
    await db.insert(claimDocuments).values({
      claimId: claim.id,
      documentId: doc.id,
      documentRole: 'zahlungserklaerung',
    });

    const account = release.account as PayoutAccount;
    const auditRecord = {
      ...((release.auditRecord as object) ?? {}),
      event: 'ZE signed',
      name: `${claim.firstName ?? ''} ${claim.lastName ?? ''}`.trim(),
      clientId: claim.userId,
      claimId: claim.id,
      timestamp: now.toISOString(),
      ip: input.ip,
      documentId: docNumber,
      documentSha256: sha256,
      route: release.route,
      figures: text.split,
      invoiceNumber: release.invoiceNumber,
      account,
      routeChoice: release.routeChoice,
      disclosureVersion:
        (release.routeChoice as PayoutRouteChoiceLog | null)
          ?.disclosureVersion ?? null,
    };
    const [updated] = await db
      .update(payoutReleases)
      .set({
        status: 'signed',
        zeDocumentNumber: docNumber,
        zeDocumentId: doc.id,
        zeS3Key: s3Key,
        zeSha256: sha256,
        signedAt: now,
        signerIp: input.ip,
        auditRecord,
        updatedAt: now,
      })
      .where(
        and(eq(payoutReleases.id, releaseId), eq(payoutReleases.status, 'open'))
      )
      .returning();
    if (!updated)
      throw new PayoutFlowError('This release is no longer open', 409);
    await db
      .update(claimsTable)
      .set({
        payoutReleasedAt: now,
        payoutReleaseId: releaseId,
        payoutZeDocumentId: doc.id,
        payoutZeS3Key: s3Key,
        updatedAt: now,
      })
      .where(eq(claimsTable.id, claim.id));
    await this.audit({ id: userId }, 'payout_ze_signed', claim.id, auditRecord);
    logger.info('Payout: ZE signed', {
      claimId: claim.id,
      releaseId,
      docNumber,
    });
    return {
      release: releaseView(claim, updated),
      url: await getPresignedUrl(s3Key, 900),
    };
  }

  static async signedZeUrl(
    userId: string,
    releaseId: string
  ): Promise<string | null> {
    const { release } = await this.releaseForUser(userId, releaseId);
    return release.zeS3Key ? getPresignedUrl(release.zeS3Key, 900) : null;
  }

  /** Raw bytes of the signed ZE (download fallback without S3 presigning). */
  static async signedZeBytes(
    userId: string,
    releaseId: string
  ): Promise<Buffer> {
    const { release } = await this.releaseForUser(userId, releaseId);
    if (!release.zeS3Key) throw new PayoutFlowError('Not signed yet', 404);
    return downloadFile(release.zeS3Key);
  }

  /** Open payout tasks for a set of claims (admin dashboards). */
  static async openReleases(claimIds: string[]) {
    if (!claimIds.length) return [];
    return db
      .select()
      .from(payoutReleases)
      .where(
        and(
          inArray(payoutReleases.claimId, claimIds),
          eq(payoutReleases.status, 'open')
        )
      );
  }
}
