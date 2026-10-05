/**
 * Invoicing (platform brief Part 2 §1 and §6). On E1 the platform creates
 * the ATLAES invoice in Lexoffice; Lexoffice assigns the sequential
 * number, which is stored on the invoice row, on the claim
 * (`claims.invoice_number`) and on the client's release row
 * (`payout_releases.invoice_number`, read by the ZE). Invoice PDF stored
 * on the case. "Paid" when the ATLAES payout line is marked paid.
 * Corrections only by cancellation + new invoice, never by editing.
 */

import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger, toErrorMeta } from '../../utils/logger';
import { uploadFile } from '../../utils/s3';
import { auditLogs } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import {
  fundsReceipts,
  invoices,
  type InvoiceRow,
} from '../../drizzle/schema/payout-queue';
import { claimPayoutColumns } from '../payout-queue/claim-columns';
import { setReleaseInvoiceNumber } from '../payout-queue/hooks';
import { invoicingConfig } from './config';
import { buildInvoiceInput } from './build';
import { LexofficeInvoiceProvider } from './lexoffice';
import { NoopInvoiceProvider } from './noop';
import type { CreatedInvoice, InvoiceProvider } from './types';

export * from './types';
export { invoicingConfig } from './config';
export { buildInvoiceInput, invoiceAmount } from './build';

let providerOverride: InvoiceProvider | null = null;

/** Lexoffice when LEXOFFICE_API_KEY is set; otherwise the no-op provider. */
export function getInvoiceProvider(): InvoiceProvider {
  if (providerOverride) return providerOverride;
  const cfg = invoicingConfig();
  return cfg.lexofficeApiKey
    ? new LexofficeInvoiceProvider({
        apiKey: cfg.lexofficeApiKey,
        baseUrl: cfg.lexofficeBaseUrl,
      })
    : new NoopInvoiceProvider();
}

/** Tests only. */
export function setInvoiceProviderForTests(p: InvoiceProvider | null): void {
  providerOverride = p;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export class InvoicingService {
  /** Create (or return the existing) invoice for a funds receipt. */
  static async createForReceipt(
    receiptId: string,
    actorId: string | null = null
  ): Promise<InvoiceRow> {
    const [existing] = await db
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
    if (existing && existing.status !== 'cancelled') return existing;
    return this.issue(receiptId, actorId);
  }

  private static async issue(
    receiptId: string,
    actorId: string | null
  ): Promise<InvoiceRow> {
    const [receipt] = await db
      .select()
      .from(fundsReceipts)
      .where(eq(fundsReceipts.id, receiptId))
      .limit(1);
    if (!receipt) throw new Error('Funds receipt not found');
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, receipt.claimId))
      .limit(1);
    if (!claim) throw new Error('Claim not found');

    const cfg = invoicingConfig();
    const provider = getInvoiceProvider();
    const voucherDate = todayIso();
    const input = buildInvoiceInput(
      claim,
      {
        fee: Number(receipt.fee),
        atlaesShare: Number(receipt.atlaesShare),
        valueDate: receipt.valueDate,
      },
      cfg,
      voucherDate
    );

    const [row] = await db
      .insert(invoices)
      .values({
        claimId: claim.id,
        fundsReceiptId: receipt.id,
        kind: 'invoice',
        provider: provider.name,
        status: 'pending',
        grossAmount: input.grossAmount.toFixed(2),
        taxRatePercent: input.taxRatePercent.toFixed(2),
        voucherDate,
      })
      .returning();

    let created: CreatedInvoice;
    try {
      created = await provider.createInvoice(input);
    } catch (error) {
      logger.error('[Invoicing] invoice creation failed', toErrorMeta(error));
      created = {
        status: 'pending',
        providerId: null,
        invoiceNumber: null,
        error:
          error instanceof Error ? error.message : 'Invoice creation failed',
      };
    }
    const updated = await this.applyCreated(row, created);
    if (updated.invoiceNumber) {
      await this.propagateNumber(updated, receipt.payoutReleaseId, actorId);
    }
    await db.insert(auditLogs).values({
      userId: actorId,
      action: 'invoice_created',
      resource: 'claim',
      resourceId: claim.id,
      details: {
        invoiceId: updated.id,
        provider: updated.provider,
        status: updated.status,
        invoiceNumber: updated.invoiceNumber,
        grossAmount: updated.grossAmount,
        error: updated.lastError,
      },
    });
    return updated;
  }

  private static async applyCreated(
    row: InvoiceRow,
    created: CreatedInvoice
  ): Promise<InvoiceRow> {
    let pdfS3Key: string | null = null;
    if (created.pdf && created.pdf.length) {
      pdfS3Key = `claims/${row.claimId}/invoices/${row.id}.pdf`;
      try {
        await uploadFile(pdfS3Key, created.pdf, 'application/pdf');
      } catch (error) {
        logger.error('[Invoicing] PDF upload failed', toErrorMeta(error));
        pdfS3Key = null;
      }
    }
    const [updated] = await db
      .update(invoices)
      .set({
        status: created.status,
        providerId: created.providerId,
        invoiceNumber: created.invoiceNumber,
        pdfS3Key,
        lastError: created.error ?? null,
        issuedAt: created.status === 'issued' ? new Date() : null,
      })
      .where(eq(invoices.id, row.id))
      .returning();
    return updated;
  }

  /** Write the number onto the claim and the client's release row. */
  static async propagateNumber(
    invoice: InvoiceRow,
    payoutReleaseId: string | null,
    actorId: string | null = null
  ): Promise<void> {
    await db
      .update(claimPayoutColumns)
      .set({ invoiceNumber: invoice.invoiceNumber, updatedAt: new Date() })
      .where(eq(claimPayoutColumns.id, invoice.claimId));
    if (payoutReleaseId && invoice.invoiceNumber) {
      try {
        await setReleaseInvoiceNumber(
          payoutReleaseId,
          invoice.invoiceNumber,
          actorId
        );
      } catch (error) {
        // Release already signed: the ZE carries the earlier number; ops
        // must handle the correction with the client.
        logger.warn('[Invoicing] release invoice number not updated', {
          payoutReleaseId,
          invoiceNumber: invoice.invoiceNumber,
          ...toErrorMeta(error),
        });
      }
    }
  }

  /** Re-run a pending invoice (provider was down / key added later). */
  static async retryPending(
    invoiceId: string,
    actorId: string | null
  ): Promise<InvoiceRow> {
    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (!row) throw new Error('Invoice not found');
    if (
      row.status !== 'pending' ||
      row.kind !== 'invoice' ||
      !row.fundsReceiptId
    ) {
      throw new Error('Invalid state: only pending invoices can be retried');
    }
    await db
      .update(invoices)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        lastError: 'superseded by retry',
      })
      .where(eq(invoices.id, row.id));
    return this.issue(row.fundsReceiptId, actorId);
  }

  /** ATLAES payout line marked paid → invoice paid. */
  static async markPaid(
    invoiceId: string,
    paidOn: string,
    actorId: string | null
  ): Promise<InvoiceRow> {
    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (!row) throw new Error('Invoice not found');
    if (row.status === 'paid') return row;
    let syncedAt: Date | null = null;
    let note: string | undefined;
    if (row.providerId) {
      const res = await getInvoiceProvider()
        .markPaid(row.providerId, paidOn)
        .catch((e: unknown) => ({
          synced: false,
          note: e instanceof Error ? e.message : 'markPaid failed',
        }));
      if (res.synced) syncedAt = new Date();
      note = res.note;
    }
    const [updated] = await db
      .update(invoices)
      .set({
        status: 'paid',
        paidOn,
        paidAt: new Date(),
        providerPaidSyncedAt: syncedAt,
      })
      .where(eq(invoices.id, row.id))
      .returning();
    await db.insert(auditLogs).values({
      userId: actorId,
      action: 'invoice_paid',
      resource: 'claim',
      resourceId: row.claimId,
      details: {
        invoiceId: row.id,
        invoiceNumber: row.invoiceNumber,
        paidOn,
        providerSynced: !!syncedAt,
        note,
      },
    });
    return updated;
  }

  /**
   * Correction (brief §6): cancellation document for the issued invoice,
   * optionally followed by a new invoice for the same receipt. The issued
   * invoice itself is never edited.
   */
  static async cancel(
    invoiceId: string,
    opts: { reissue: boolean; actorId: string | null; reason: string }
  ): Promise<{ cancellation: InvoiceRow; reissued: InvoiceRow | null }> {
    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (!row) throw new Error('Invoice not found');
    if (row.kind !== 'invoice' || row.status === 'cancelled') {
      throw new Error('Invalid state: invoice is not cancellable');
    }
    if (row.status === 'paid') {
      throw new Error('Invalid state: a paid invoice cannot be cancelled here');
    }
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, row.claimId))
      .limit(1);
    if (!claim) throw new Error('Claim not found');

    const cfg = invoicingConfig();
    const provider = getInvoiceProvider();
    const voucherDate = todayIso();
    const input = {
      ...buildInvoiceInput(
        claim,
        {
          fee: Number(row.grossAmount),
          atlaesShare: Number(row.grossAmount),
          valueDate: voucherDate,
        },
        cfg,
        voucherDate
      ),
      grossAmount: Number(row.grossAmount),
      taxRatePercent: Number(row.taxRatePercent),
    };

    const [cancelRow] = await db
      .insert(invoices)
      .values({
        claimId: row.claimId,
        fundsReceiptId: row.fundsReceiptId,
        kind: 'cancellation',
        cancelsInvoiceId: row.id,
        provider: provider.name,
        status: 'pending',
        grossAmount: row.grossAmount,
        taxRatePercent: row.taxRatePercent,
        voucherDate,
      })
      .returning();

    let created: CreatedInvoice;
    if (row.providerId) {
      try {
        created = await provider.createCancellation(
          { providerId: row.providerId, invoiceNumber: row.invoiceNumber },
          input
        );
      } catch (error) {
        logger.error('[Invoicing] cancellation failed', toErrorMeta(error));
        created = {
          status: 'pending',
          providerId: null,
          invoiceNumber: null,
          error: error instanceof Error ? error.message : 'Cancellation failed',
        };
      }
    } else {
      // Never issued at the provider: nothing to cancel there.
      created = { status: 'issued', providerId: null, invoiceNumber: null };
    }
    const cancellation = await this.applyCreated(cancelRow, created);
    await db
      .update(invoices)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(eq(invoices.id, row.id));
    await db.insert(auditLogs).values({
      userId: opts.actorId,
      action: 'invoice_cancelled',
      resource: 'claim',
      resourceId: row.claimId,
      details: {
        invoiceId: row.id,
        invoiceNumber: row.invoiceNumber,
        cancellationId: cancellation.id,
        cancellationNumber: cancellation.invoiceNumber,
        reason: opts.reason,
      },
    });

    let reissued: InvoiceRow | null = null;
    if (opts.reissue && row.fundsReceiptId) {
      reissued = await this.issue(row.fundsReceiptId, opts.actorId);
    } else {
      await db
        .update(claimPayoutColumns)
        .set({ invoiceNumber: null, updatedAt: new Date() })
        .where(eq(claimPayoutColumns.id, row.claimId));
    }
    return { cancellation, reissued };
  }

  static async listForClaim(claimId: string): Promise<InvoiceRow[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.claimId, claimId))
      .orderBy(desc(invoices.createdAt));
  }
}
