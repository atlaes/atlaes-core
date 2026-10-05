/**
 * Law-firm payout queue (platform brief Part 2 §5) — replaces the gsheet
 * "Übersicht Überweisungen".
 *
 * Visible: cases of the firm with a signed Zahlungserklärung (release row
 * status 'signed', review flag clear) and at least one open transfer line.
 * Lines are materialised from the release on first view (or when the
 * release flow calls `onReleased`). No address, date of birth or VSNR.
 */

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger, toErrorMeta } from '../../utils/logger';
import { getPresignedUrl } from '../../utils/s3';
import { auditLogs, documents } from '../../drizzle/schema/shared';
import { claimDocuments, claimsTable } from '../../drizzle/schema/claims';
import { payoutDecisions, payoutReleases } from '../../drizzle/schema/payout';
import {
  fundsReceipts,
  invoices,
  payoutLines,
  type InvoiceRow,
  type PayoutLineRow,
} from '../../drizzle/schema/payout-queue';
import { PROVIDER_REGISTER, summitFxCurrency } from '../payout-flow/providers';
import { InvoicingService } from '../invoicing';
import { claimPayoutColumns } from './claim-columns';
import {
  atlaesAccount,
  dailyTransferLimitEur,
  payoutFeeConfig,
} from './config';
import {
  buildPayoutLines,
  exportCsv,
  sumCheck,
  type ExportRow,
  type RouteCode,
} from './lines';

export * from './lines';
export { FundsService } from './funds';

const DOWNLOAD_TTL_SECONDS = 15 * 60;

export interface QueueLine {
  id: string;
  kind: 'atlaes' | 'client';
  recipient: string;
  amount: number;
  account: string;
  bic: string | null;
  bank: string | null;
  transferMethod: string;
  reference: string;
  currency: string | null;
  route: string | null;
  status: 'open' | 'paid';
  paidOn: string | null;
  remarks: string | null;
}

export interface QueueCase {
  claimId: string;
  releaseId: string;
  clientName: string;
  zeSignedAt: string | null;
  invoiceNumber: string | null;
  valueDate: string;
  totalReceived: number;
  lawFirmFee: number;
  atlaesShare: number;
  sumOk: boolean;
  hasZe: boolean;
  hasBescheid: boolean;
  lines: QueueLine[];
}

export interface QueueView {
  cases: QueueCase[];
  paidTodayEur: number;
  dailyLimitEur: number;
  today: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const n = (v: string | number | null | undefined) =>
  v == null ? 0 : Number(v);
const nameOf = (c: { firstName: string | null; lastName: string | null }) =>
  [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '—';

function queueLine(l: PayoutLineRow, invoice: InvoiceRow | null): QueueLine {
  const remarks = [l.remarks];
  if (
    l.kind === 'atlaes' &&
    l.status === 'paid' &&
    invoice?.status === 'paid'
  ) {
    remarks.push(
      invoice.providerPaidSyncedAt || invoice.provider === 'lexoffice'
        ? 'Invoice set to paid (Lexoffice)'
        : 'Invoice set to paid'
    );
  }
  return {
    id: l.id,
    kind: l.kind as QueueLine['kind'],
    recipient: l.recipient,
    amount: n(l.amount),
    account: l.account,
    bic: l.bic,
    bank: l.bank,
    transferMethod: l.transferMethod,
    reference: l.reference,
    currency: l.currency,
    route: l.route,
    status: l.status as QueueLine['status'],
    paidOn: l.paidOn,
    remarks: remarks.filter(Boolean).join(' · ') || null,
  };
}

export class PayoutQueueService {
  /**
   * Create the transfer lines for a signed release (idempotent). Called
   * from the queue listing; the release flow may also call it right after
   * signing.
   */
  static async onReleased(releaseId: string): Promise<PayoutLineRow[]> {
    const existing = await db
      .select()
      .from(payoutLines)
      .where(eq(payoutLines.payoutReleaseId, releaseId));
    if (existing.length) return existing;

    const [release] = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.id, releaseId))
      .limit(1);
    if (!release || release.status !== 'signed') return [];
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, release.claimId))
      .limit(1);
    if (!claim) return [];

    const [receipt] = await db
      .select()
      .from(fundsReceipts)
      .where(eq(fundsReceipts.payoutReleaseId, release.id))
      .limit(1);

    const invoiceNumber =
      release.invoiceNumber ??
      (receipt ? await this.invoiceNumberForReceipt(receipt.id) : null);
    const route = (release.route as RouteCode | null) ?? null;
    const currency = release.account?.currency ?? 'EUR';
    const reg = route === 'B' ? summitFxCurrency(currency) : null;

    const drafts = buildPayoutLines({
      clientName: nameOf(claim),
      figures: {
        amountReceived: n(release.amountReceivedEur),
        fee: n(release.feeEur),
        feeCapped: release.feeCapped,
        smallRefund: release.smallRefund,
        lawFirmFee: n(release.lawFirmFeeEur),
        atlaesShare: n(release.atlaesShareEur),
        clientAmount: n(release.clientAmountEur),
        invoiceNumber,
        route,
        account: release.account ?? null,
      },
      atlaes: atlaesAccount(),
      feeCapEur: payoutFeeConfig().capEur,
      collectionAccount: reg?.collectionAccount ?? null,
      providerName: PROVIDER_REGISTER.B.provider.name,
    });

    const rows = await db
      .insert(payoutLines)
      .values(
        drafts.map((d) => ({
          claimId: claim.id,
          payoutReleaseId: release.id,
          fundsReceiptId: receipt?.id ?? null,
          lawFirmId: claim.lawFirmId,
          kind: d.kind,
          route: d.route,
          recipient: d.recipient,
          amount: d.amount.toFixed(2),
          account: d.account,
          bic: d.bic,
          bank: d.bank,
          transferMethod: d.transferMethod,
          reference: d.reference,
          currency: d.currency,
          remarks: d.remarks,
        }))
      )
      .onConflictDoNothing()
      .returning();
    if (receipt && !receipt.releasedAt) {
      await db
        .update(fundsReceipts)
        .set({ releasedAt: new Date() })
        .where(eq(fundsReceipts.id, receipt.id));
    }
    return rows.length
      ? rows
      : db
          .select()
          .from(payoutLines)
          .where(eq(payoutLines.payoutReleaseId, releaseId));
  }

  private static async invoiceNumberForReceipt(receiptId: string) {
    const [inv] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.fundsReceiptId, receiptId),
          eq(invoices.kind, 'invoice')
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    return inv && inv.status !== 'cancelled' ? inv.invoiceNumber : null;
  }

  /** Signed, review-cleared releases of the firm without lines yet. */
  private static async materialiseForFirm(firmId: string): Promise<void> {
    const pending = await db
      .select({ id: payoutReleases.id })
      .from(payoutReleases)
      .innerJoin(claimsTable, eq(claimsTable.id, payoutReleases.claimId))
      .where(
        and(
          eq(claimsTable.lawFirmId, firmId),
          eq(payoutReleases.status, 'signed'),
          // "payout details need review" blocks the queue until cleared.
          eq(claimsTable.payoutDetailsReviewRequired, false),
          sql`(${payoutReleases.reviewRequired} = false OR ${payoutReleases.reviewClearedAt} IS NOT NULL)`,
          sql`NOT EXISTS (SELECT 1 FROM ${payoutLines} pl WHERE pl.payout_release_id = ${payoutReleases.id})`
        )
      );
    for (const r of pending) {
      try {
        await this.onReleased(r.id);
      } catch (error) {
        logger.error('[PayoutQueue] line creation failed', toErrorMeta(error));
      }
    }
  }

  static async paidTodayEur(
    firmId: string,
    today = todayIso()
  ): Promise<number> {
    const [row] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payoutLines.amount}), 0)` })
      .from(payoutLines)
      .where(
        and(
          eq(payoutLines.lawFirmId, firmId),
          eq(payoutLines.status, 'paid'),
          eq(payoutLines.paidOn, today)
        )
      );
    return n(row?.total);
  }

  static async listQueue(firmId: string): Promise<QueueView> {
    await this.materialiseForFirm(firmId);
    const today = todayIso();

    // Releases with at least one open line.
    const openReleaseIds = (
      await db
        .selectDistinct({ id: payoutLines.payoutReleaseId })
        .from(payoutLines)
        .where(
          and(eq(payoutLines.lawFirmId, firmId), eq(payoutLines.status, 'open'))
        )
    ).map((r) => r.id);

    const cases: QueueCase[] = [];
    if (openReleaseIds.length) {
      const releases = await db
        .select()
        .from(payoutReleases)
        .where(inArray(payoutReleases.id, openReleaseIds))
        .orderBy(asc(payoutReleases.signedAt));
      const claimIds = [...new Set(releases.map((r) => r.claimId))];
      const claimRows = await db
        .select({
          id: claimsTable.id,
          firstName: claimsTable.firstName,
          lastName: claimsTable.lastName,
          payoutZeS3Key: claimsTable.payoutZeS3Key,
        })
        .from(claimsTable)
        .where(inArray(claimsTable.id, claimIds));
      const lines = await db
        .select()
        .from(payoutLines)
        .where(inArray(payoutLines.payoutReleaseId, openReleaseIds))
        .orderBy(asc(payoutLines.kind));
      const receiptIds = lines
        .map((l) => l.fundsReceiptId)
        .filter(Boolean) as string[];
      const invoiceRows = receiptIds.length
        ? await db
            .select()
            .from(invoices)
            .where(
              and(
                inArray(invoices.fundsReceiptId, receiptIds),
                eq(invoices.kind, 'invoice')
              )
            )
        : [];
      const bescheidClaims = new Set(
        (
          await db
            .selectDistinct({ claimId: payoutDecisions.claimId })
            .from(payoutDecisions)
            .where(
              and(
                inArray(payoutDecisions.claimId, claimIds),
                sql`${payoutDecisions.documentId} IS NOT NULL`
              )
            )
        ).map((r) => r.claimId)
      );

      for (const r of releases) {
        const claim = claimRows.find((c) => c.id === r.claimId);
        const rl = lines
          .filter((l) => l.payoutReleaseId === r.id)
          .sort((a, b) =>
            a.kind === b.kind ? 0 : a.kind === 'atlaes' ? -1 : 1
          );
        const inv =
          invoiceRows
            .filter((i) =>
              rl.some((l) => l.fundsReceiptId === i.fundsReceiptId)
            )
            .sort(
              (a, b) =>
                (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
            )[0] ?? null;
        const figures = {
          amountReceived: n(r.amountReceivedEur),
          lawFirmFee: n(r.lawFirmFeeEur),
          atlaesShare: n(r.atlaesShareEur),
          clientAmount: n(r.clientAmountEur),
        };
        cases.push({
          claimId: r.claimId,
          releaseId: r.id,
          clientName: claim ? nameOf(claim) : '—',
          zeSignedAt: r.signedAt ? r.signedAt.toISOString() : null,
          invoiceNumber: r.invoiceNumber ?? inv?.invoiceNumber ?? null,
          valueDate: r.valueDate,
          totalReceived: figures.amountReceived,
          lawFirmFee: figures.lawFirmFee,
          atlaesShare: figures.atlaesShare,
          sumOk: sumCheck(figures),
          hasZe: !!(r.zeS3Key || claim?.payoutZeS3Key),
          hasBescheid: bescheidClaims.has(r.claimId),
          lines: rl.map((l) => queueLine(l, l.kind === 'atlaes' ? inv : null)),
        });
      }
    }

    return {
      cases,
      paidTodayEur: await this.paidTodayEur(firmId, today),
      dailyLimitEur: dailyTransferLimitEur(),
      today,
    };
  }

  /** "Mark paid" (brief §5): date defaults to today, editable. */
  static async markLinePaid(input: {
    firmId: string;
    lineId: string;
    paidOn?: string | null;
    actorId: string;
    ip?: string | null;
  }): Promise<{
    line: PayoutLineRow;
    caseClosed: boolean;
    invoicePaid: boolean;
  }> {
    const paidOn = input.paidOn || todayIso();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) throw new Error('Invalid date');
    const [line] = await db
      .select()
      .from(payoutLines)
      .where(
        and(
          eq(payoutLines.id, input.lineId),
          eq(payoutLines.lawFirmId, input.firmId)
        )
      )
      .limit(1);
    if (!line) throw new Error('Line not found');
    if (line.status === 'paid') {
      return { line, caseClosed: false, invoicePaid: false };
    }
    const [updated] = await db
      .update(payoutLines)
      .set({
        status: 'paid',
        paidOn,
        paidBy: input.actorId,
        paidAt: new Date(),
      })
      .where(and(eq(payoutLines.id, line.id), eq(payoutLines.status, 'open')))
      .returning();
    if (!updated) {
      const [fresh] = await db
        .select()
        .from(payoutLines)
        .where(eq(payoutLines.id, line.id));
      return { line: fresh, caseClosed: false, invoicePaid: false };
    }

    await db.insert(auditLogs).values({
      userId: input.actorId,
      action: 'payout_line_paid',
      resource: 'claim',
      resourceId: line.claimId,
      details: {
        lineId: line.id,
        kind: line.kind,
        amount: line.amount,
        recipient: line.recipient,
        reference: line.reference,
        paidOn,
      },
      ipAddress: input.ip ?? null,
    });

    let invoicePaid = false;
    if (line.kind === 'atlaes') {
      try {
        const inv = await this.invoiceForLine(line);
        if (inv) {
          await InvoicingService.markPaid(inv.id, paidOn, input.actorId);
          invoicePaid = true;
        }
      } catch (error) {
        logger.error('[PayoutQueue] invoice paid failed', toErrorMeta(error));
      }
    } else {
      // TODO(Workflow D): transfer-confirmation e-mail to the client. The
      // brief references "Workflow D" but its text is not in Part 3 yet.
      logger.info(
        '[PayoutQueue] client line paid — transfer confirmation pending (Workflow D)',
        {
          claimId: line.claimId,
        }
      );
    }

    const [open] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(payoutLines)
      .where(
        and(
          eq(payoutLines.claimId, line.claimId),
          eq(payoutLines.status, 'open')
        )
      );
    const caseClosed = (open?.c ?? 0) === 0;
    if (caseClosed) {
      await db
        .update(claimPayoutColumns)
        .set({ paidOutAt: new Date(), updatedAt: new Date() })
        .where(eq(claimPayoutColumns.id, line.claimId));
      await db.insert(auditLogs).values({
        userId: input.actorId,
        action: 'paid_out',
        resource: 'claim',
        resourceId: line.claimId,
        details: { lastLineId: line.id, paidOn },
      });
    }
    return { line: updated, caseClosed, invoicePaid };
  }

  private static async invoiceForLine(
    line: PayoutLineRow
  ): Promise<InvoiceRow | null> {
    if (line.fundsReceiptId) {
      const [inv] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.fundsReceiptId, line.fundsReceiptId),
            eq(invoices.kind, 'invoice')
          )
        )
        .orderBy(desc(invoices.createdAt))
        .limit(1);
      if (inv && inv.status !== 'cancelled') return inv;
    }
    const [inv] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.claimId, line.claimId),
          eq(invoices.kind, 'invoice'),
          eq(invoices.invoiceNumber, line.reference)
        )
      )
      .limit(1);
    return inv ?? null;
  }

  static async exportCsv(firmId: string): Promise<string> {
    const view = await this.listQueue(firmId);
    const rows: ExportRow[] = [];
    for (const c of view.cases) {
      for (const l of c.lines) {
        rows.push({
          clientName: c.clientName,
          zeSigned: !!c.zeSignedAt,
          valueDate: c.valueDate,
          totalReceived: c.totalReceived,
          lawFirmFee: c.lawFirmFee,
          atlaesShare: c.atlaesShare,
          sumOk: c.sumOk,
          recipient: l.recipient,
          amount: l.amount,
          account: l.account,
          bic: l.bic,
          bank: l.bank,
          transferMethod: l.transferMethod,
          reference: l.reference,
          status:
            l.status === 'paid' ? `paid ${l.paidOn ?? ''}`.trim() : 'open',
          remarks: l.remarks,
        });
      }
    }
    return exportCsv(rows);
  }

  /** ZE / Bescheid download for a case in the firm's queue (logged). */
  static async getDownload(input: {
    firmId: string;
    claimId: string;
    kind: 'ze' | 'bescheid';
    actorId: string;
    ip?: string | null;
  }): Promise<{ url: string; fileName: string } | null> {
    const [visible] = await db
      .select({ id: payoutLines.id })
      .from(payoutLines)
      .where(
        and(
          eq(payoutLines.claimId, input.claimId),
          eq(payoutLines.lawFirmId, input.firmId)
        )
      )
      .limit(1);
    if (!visible) throw new Error('Claim not found');

    let key: string | null = null;
    let fileName = '';
    if (input.kind === 'ze') {
      const [release] = await db
        .select({
          key: payoutReleases.zeS3Key,
          num: payoutReleases.zeDocumentNumber,
        })
        .from(payoutReleases)
        .where(
          and(
            eq(payoutReleases.claimId, input.claimId),
            eq(payoutReleases.status, 'signed')
          )
        )
        .orderBy(desc(payoutReleases.signedAt))
        .limit(1);
      const [claim] = await db
        .select({ key: claimsTable.payoutZeS3Key })
        .from(claimsTable)
        .where(eq(claimsTable.id, input.claimId))
        .limit(1);
      key = release?.key ?? claim?.key ?? null;
      fileName = `Zahlungserklaerung${release?.num ? `_${release.num}` : ''}.pdf`;
    } else {
      const [dec] = await db
        .select({ key: documents.s3Key, name: documents.fileName })
        .from(payoutDecisions)
        .innerJoin(documents, eq(documents.id, payoutDecisions.documentId))
        .where(eq(payoutDecisions.claimId, input.claimId))
        .orderBy(desc(payoutDecisions.createdAt))
        .limit(1);
      if (dec) {
        key = dec.key;
        fileName = dec.name;
      } else {
        const [doc] = await db
          .select({ key: documents.s3Key, name: documents.fileName })
          .from(claimDocuments)
          .innerJoin(documents, eq(documents.id, claimDocuments.documentId))
          .where(
            and(
              eq(claimDocuments.claimId, input.claimId),
              eq(claimDocuments.documentRole, 'drv_refund_decision')
            )
          )
          .orderBy(desc(claimDocuments.createdAt))
          .limit(1);
        key = doc?.key ?? null;
        fileName = doc?.name ?? 'Bescheid.pdf';
      }
    }
    if (!key) return null;
    const url = await getPresignedUrl(key, DOWNLOAD_TTL_SECONDS);
    if (!url) return null;
    await db.insert(auditLogs).values({
      userId: input.actorId,
      action:
        input.kind === 'ze'
          ? 'law_firm_ze_download'
          : 'law_firm_bescheid_download',
      resource: 'claim',
      resourceId: input.claimId,
      details: { fileName },
      ipAddress: input.ip ?? null,
    });
    return { url, fileName };
  }

  /** Annual-settlement list (brief §1): client ID, name, amount, date. */
  static async smallRefundSettlementCsv(): Promise<string> {
    const rows = await db
      .select({
        claimId: fundsReceipts.claimId,
        userId: claimsTable.userId,
        firstName: claimsTable.firstName,
        lastName: claimsTable.lastName,
        amount: fundsReceipts.amountReceived,
        fee: fundsReceipts.fee,
        valueDate: fundsReceipts.valueDate,
      })
      .from(fundsReceipts)
      .innerJoin(claimsTable, eq(claimsTable.id, fundsReceipts.claimId))
      .where(eq(fundsReceipts.smallRefund, true))
      .orderBy(asc(fundsReceipts.valueDate));
    const esc = (v: string) =>
      /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const lines = rows.map((r) =>
      [
        r.userId,
        r.claimId,
        nameOf(r),
        Number(r.amount).toFixed(2),
        Number(r.fee).toFixed(2),
        r.valueDate,
      ]
        .map((v) => esc(String(v)))
        .join(';')
    );
    return `﻿${['Client ID;Case ID;Name;Amount received;Fee;Value date', ...lines].join('\r\n')}\r\n`;
  }
}
