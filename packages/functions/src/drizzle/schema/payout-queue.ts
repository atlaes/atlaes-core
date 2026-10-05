/**
 * Incoming funds, invoices and the law-firm payout queue (platform brief
 * 16 Sep 2026, Part 2: E1 "funds received", §1 fee and invoice, §5 payout
 * queue, §6 invoicing). Migration 0021.
 *
 *  - statement_imports / statement_lines: the firm's account-statement
 *    uploads, one row per statement line; unmatched credits form the
 *    ATLAES reconciliation queue.
 *  - funds_receipts: one row per E1 (amount and value date from the
 *    statement are authoritative) with the frozen fee split. A later
 *    additional payment on the same case is a new receipt.
 *  - invoices: the ATLAES fee invoice per receipt (Lexoffice); corrections
 *    only by a cancellation row + a new invoice, never by editing.
 *  - payout_lines: the transfer lines the firm executes (ATLAES share,
 *    client remainder); replaces the gsheet "Übersicht Überweisungen".
 *
 * Claim-level columns added by 0021 (invoice_number, paid_out_at) are read
 * through `services/payout-queue/claim-columns.ts` because claims.ts is
 * owned by another stream. The client release (route, account, signed ZE)
 * lives in `payout.ts` (payout_releases, migration 0020); each receipt
 * links to its release row.
 */

import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { claims, claimsTable } from './claims';
import { lawFirms, users } from './shared';
import { payoutReleases } from './payout';

export const STATEMENT_LINE_STATUSES = [
  'matched', // credit matched to a case → E1 recorded
  'unmatched', // credit in the reconciliation queue
  'assigned', // unmatched credit later assigned by ATLAES → E1 recorded
  'dismissed', // ATLAES decided it is not a refund receipt
  'debit', // outgoing / zero line, ignored
  'duplicate', // already imported from an earlier statement
  'invalid', // no parsable amount or date
] as const;
export type StatementLineStatus = (typeof STATEMENT_LINE_STATUSES)[number];

export const statementImports = claims.table(
  'statement_imports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lawFirmId: uuid('law_firm_id')
      .notNull()
      .references(() => lawFirms.id),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileKind: varchar('file_kind', { length: 10 }).notNull(), // 'xlsx' | 'csv'
    s3Key: varchar('s3_key', { length: 500 }),
    columnMap: jsonb('column_map').notNull(),
    lineCount: integer('line_count').notNull().default(0),
    matchedCount: integer('matched_count').notNull().default(0),
    unmatchedCount: integer('unmatched_count').notNull().default(0),
    matchedTotal: decimal('matched_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    firmIdx: index('statement_imports_firm_idx').on(t.lawFirmId, t.createdAt),
  })
);

export const statementLines = claims.table(
  'statement_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    importId: uuid('import_id')
      .notNull()
      .references(() => statementImports.id, { onDelete: 'cascade' }),
    lawFirmId: uuid('law_firm_id')
      .notNull()
      .references(() => lawFirms.id),
    lineNo: integer('line_no').notNull(),
    valueDate: date('value_date'),
    amount: decimal('amount', { precision: 12, scale: 2 }),
    reference: text('reference'),
    payer: varchar('payer', { length: 255 }),
    raw: jsonb('raw'),
    status: varchar('status', { length: 20 }).notNull(),
    matchReason: varchar('match_reason', { length: 20 }),
    claimId: uuid('claim_id').references(() => claimsTable.id),
    suggestedClaimIds: jsonb('suggested_claim_ids').$type<string[]>(),
    // Free-text hint from the firm ("Suggest a case"); ATLAES decides.
    firmSuggestion: text('firm_suggestion'),
    firmSuggestedAt: timestamp('firm_suggested_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNote: text('resolution_note'),
    // sha256(firm|value date|amount|reference|payer) — the same booking in
    // two overlapping statements is imported once.
    dedupeHash: varchar('dedupe_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    importIdx: index('statement_lines_import_idx').on(t.importId),
    statusIdx: index('statement_lines_status_idx').on(t.status),
    dedupeIdx: index('statement_lines_dedupe_idx').on(
      t.lawFirmId,
      t.dedupeHash
    ),
  })
);

export const fundsReceipts = claims.table(
  'funds_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id),
    statementLineId: uuid('statement_line_id').references(
      () => statementLines.id
    ),
    amountReceived: decimal('amount_received', {
      precision: 12,
      scale: 2,
    }).notNull(),
    valueDate: date('value_date').notNull(),
    fee: decimal('fee', { precision: 12, scale: 2 }).notNull(),
    feeCapped: boolean('fee_capped').notNull().default(false),
    smallRefund: boolean('small_refund').notNull().default(false),
    lawFirmFee: decimal('law_firm_fee', { precision: 12, scale: 2 }).notNull(),
    atlaesShare: decimal('atlaes_share', { precision: 12, scale: 2 }).notNull(),
    clientAmount: decimal('client_amount', {
      precision: 12,
      scale: 2,
    }).notNull(),
    feeConfig: jsonb('fee_config').notNull(),
    // Decision (Bescheid) amount at the time of the check; OCR, informational.
    decisionAmount: decimal('decision_amount', { precision: 12, scale: 2 }),
    amountMismatch: boolean('amount_mismatch').notNull().default(false),
    notificationKind: varchar('notification_kind', { length: 4 }),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    // The client's release row for this E1 (payout.ts, payout_releases).
    payoutReleaseId: uuid('payout_release_id'),
    // Set when the client's release (signed ZE) covers this receipt and
    // its payout lines were created.
    releasedAt: timestamp('released_at', { withTimezone: true }),
    recordedBy: uuid('recorded_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    claimIdx: index('funds_receipts_claim_idx').on(t.claimId),
    lineIdx: uniqueIndex('funds_receipts_statement_line_uq').on(
      t.statementLineId
    ),
  })
);

export const INVOICE_STATUSES = [
  'pending', // no invoice provider configured / provider call failed
  'issued',
  'paid',
  'cancelled',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoices = claims.table(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id),
    fundsReceiptId: uuid('funds_receipt_id').references(() => fundsReceipts.id),
    kind: varchar('kind', { length: 20 }).notNull().default('invoice'), // 'invoice' | 'cancellation'
    cancelsInvoiceId: uuid('cancels_invoice_id'),
    provider: varchar('provider', { length: 20 }).notNull(), // 'lexoffice' | 'none'
    providerId: varchar('provider_id', { length: 100 }),
    invoiceNumber: varchar('invoice_number', { length: 50 }),
    status: varchar('status', { length: 20 }).notNull(),
    grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull(),
    taxRatePercent: decimal('tax_rate_percent', {
      precision: 5,
      scale: 2,
    }).notNull(),
    voucherDate: date('voucher_date').notNull(),
    pdfS3Key: varchar('pdf_s3_key', { length: 500 }),
    lastError: text('last_error'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paidOn: date('paid_on'),
    providerPaidSyncedAt: timestamp('provider_paid_synced_at', {
      withTimezone: true,
    }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    claimIdx: index('invoices_claim_idx').on(t.claimId),
  })
);

export const PAYOUT_LINE_KINDS = ['atlaes', 'client'] as const;
export type PayoutLineKind = (typeof PAYOUT_LINE_KINDS)[number];
/** Transfer method shown in the SEPA/SWIFT column. */
export const PAYOUT_TRANSFER_METHODS = ['SEPA', 'SWIFT'] as const;

export const payoutLines = claims.table(
  'payout_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id),
    // The client's release (payout_releases, one per E1) the line pays out.
    payoutReleaseId: uuid('payout_release_id')
      .notNull()
      .references(() => payoutReleases.id),
    fundsReceiptId: uuid('funds_receipt_id').references(() => fundsReceipts.id),
    lawFirmId: uuid('law_firm_id').references(() => lawFirms.id),
    kind: varchar('kind', { length: 10 }).notNull(),
    // Client payout route from the release step: A SEPA, B provider
    // (conversion), C SWIFT. Null on the ATLAES line.
    route: varchar('route', { length: 1 }),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    account: varchar('account', { length: 100 }).notNull(),
    bic: varchar('bic', { length: 20 }),
    bank: varchar('bank', { length: 255 }),
    transferMethod: varchar('transfer_method', { length: 10 }).notNull(),
    reference: varchar('reference', { length: 140 }).notNull(),
    currency: varchar('currency', { length: 3 }),
    remarks: text('remarks'),
    status: varchar('status', { length: 10 }).notNull().default('open'), // 'open' | 'paid'
    paidOn: date('paid_on'),
    paidBy: uuid('paid_by').references(() => users.id),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    claimIdx: index('payout_lines_claim_idx').on(t.claimId),
    statusIdx: index('payout_lines_status_idx').on(t.lawFirmId, t.status),
    releaseKindIdx: uniqueIndex('payout_lines_release_kind_uq').on(
      t.payoutReleaseId,
      t.kind
    ),
  })
);

export type StatementImportRow = typeof statementImports.$inferSelect;
export type StatementLineRow = typeof statementLines.$inferSelect;
export type FundsReceiptRow = typeof fundsReceipts.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;
export type PayoutLineRow = typeof payoutLines.$inferSelect;
