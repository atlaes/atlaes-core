/**
 * Client review-and-release payout flow (platform brief 2026-09-16,
 * Part 2 §2–§4). Migration 0020.
 *
 *  - `payout_decisions`: one row per Bescheid (E2). Extracted figures,
 *    admin corrections, the objection deadline and the client's review
 *    outcome (confirmed / disputed).
 *  - `payout_customer_inputs`: what the client reported on "Report missing
 *    periods" (free text + payslips) — the internal ATLAES task carrying
 *    the objection deadline.
 *  - `payout_releases`: one row per funds event (E1). Fee split, bank
 *    details, route choice log, the signed Zahlungserklärung and its audit
 *    record. A later additional payment is a new row (new invoice, new ZE).
 *
 * The per-claim columns the law-firm payout queue reads
 * (`payout_released_at`, `payout_ze_document_id`, …) live on
 * `claims.claims` and are declared in `claims.ts`.
 */

import {
  boolean,
  date,
  decimal,
  index,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { claims, claimsTable } from './claims';
import { documents, users } from './shared';

/** One row of the periods table on the Bescheid. Amounts in EUR. */
export interface PayoutDecisionPeriod {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  entgeltEur: number | null;
  contributionsEur: number | null;
}

export const PAYOUT_REVIEW_OUTCOMES = ['confirmed', 'disputed'] as const;
export type PayoutReviewOutcome = (typeof PAYOUT_REVIEW_OUTCOMES)[number];

export const payoutDecisions = claims.table(
  'payout_decisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => documents.id),
    // Date the law firm received the letter (receipt stamp); the objection
    // deadline runs from here. Fallback: intake timestamp.
    receivedAt: date('received_at').notNull(),
    decisionDate: date('decision_date'),
    office: varchar('office', { length: 255 }),
    refundAmountEur: decimal('refund_amount_eur', { precision: 12, scale: 2 }),
    periods: jsonb('periods').$type<PayoutDecisionPeriod[]>().default([]),
    objectionDeadline: date('objection_deadline').notNull(),
    clientReviewBy: date('client_review_by').notNull(),
    // Raw OCR result (details, confidence, missingFields, model).
    extraction: jsonb('extraction'),
    extractionError: text('extraction_error'),
    correctedBy: uuid('corrected_by').references(() => users.id),
    correctedAt: timestamp('corrected_at', { withTimezone: true }),
    reviewOutcome: varchar('review_outcome', { length: 20 }), // PayoutReviewOutcome
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    // A1–A3 e-mail sent for this event ('A2' | 'A3' | 'none').
    notifiedKind: varchar('notified_kind', { length: 10 }),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('payout_decisions_claim_id_idx').on(table.claimId),
  })
);

export const payoutCustomerInputs = claims.table(
  'payout_customer_inputs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    decisionId: uuid('decision_id').references(() => payoutDecisions.id),
    kind: varchar('kind', { length: 30 }).notNull().default('missing_periods'),
    description: text('description').notNull(),
    documentIds: jsonb('document_ids').$type<string[]>().default([]),
    objectionDeadline: date('objection_deadline'),
    status: varchar('status', { length: 20 }).notNull().default('open'), // open | done
    createdBy: uuid('created_by').references(() => users.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('payout_customer_inputs_claim_id_idx').on(table.claimId),
  })
);

/** Recipient account as confirmed by the client (route-specific fields). */
export interface PayoutAccount {
  accountHolder: string;
  bank: string;
  country: string; // ISO 3166-1 alpha-2
  currency: string; // ISO 4217
  iban?: string | null;
  bic?: string | null;
  accountNumber?: string | null;
  routingLabel?: string | null; // "Routing number", "IFSC", "Sort code", "BSB", …
  routingValue?: string | null;
}

/** What the client saw when choosing the route (brief Part 2 §3, last bullet). */
export interface PayoutRouteChoiceLog {
  option: 1 | 2 | 3;
  route: 'A' | 'B' | 'C';
  currency: string;
  amountAvailableEur: number;
  costRate: number | null; // option 2 only
  costEur: number | null;
  estimatedTargetAmount: number | null;
  referenceRate: number | null;
  referenceRateDate: string | null;
  shownAt: string; // ISO timestamp
  disclosureVersion: string;
}

export interface PayoutReviewReason {
  kind: 'bank_details_changed' | 'holder_not_client' | 'country_mismatch';
  detail: string;
}

export const PAYOUT_RELEASE_STATUSES = ['open', 'signed', 'cancelled'] as const;
export type PayoutReleaseStatus = (typeof PAYOUT_RELEASE_STATUSES)[number];

export const payoutReleases = claims.table(
  'payout_releases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    // E1: authoritative figures from the statement line.
    amountReceivedEur: decimal('amount_received_eur', {
      precision: 12,
      scale: 2,
    }).notNull(),
    valueDate: date('value_date').notNull(),
    statementReference: text('statement_reference'),
    fundsRecordedAt: timestamp('funds_recorded_at', {
      withTimezone: true,
    }).defaultNow(),
    // Fee split (drv-pack/fee.ts computeFeeSplit) frozen at E1.
    feeEur: decimal('fee_eur', { precision: 12, scale: 2 }).notNull(),
    feeCapped: boolean('fee_capped').notNull().default(false),
    smallRefund: boolean('small_refund').notNull().default(false),
    lawFirmFeeEur: decimal('law_firm_fee_eur', {
      precision: 12,
      scale: 2,
    }).notNull(),
    atlaesShareEur: decimal('atlaes_share_eur', {
      precision: 12,
      scale: 2,
    }).notNull(),
    clientAmountEur: decimal('client_amount_eur', {
      precision: 12,
      scale: 2,
    }).notNull(),
    // Lexoffice invoice number (invoicing stream); required before signing.
    invoiceNumber: varchar('invoice_number', { length: 50 }),
    // Client's confirmation.
    account: jsonb('account').$type<PayoutAccount>(),
    accountConfirmedAt: timestamp('account_confirmed_at', {
      withTimezone: true,
    }),
    route: varchar('route', { length: 1 }), // 'A' SEPA | 'B' SummitFX | 'C' SWIFT
    routeChoice: jsonb('route_choice').$type<PayoutRouteChoiceLog>(),
    reviewRequired: boolean('review_required').notNull().default(false),
    reviewReasons: jsonb('review_reasons')
      .$type<PayoutReviewReason[]>()
      .default([]),
    reviewClearedAt: timestamp('review_cleared_at', { withTimezone: true }),
    reviewClearedBy: uuid('review_cleared_by').references(() => users.id),
    // Signed Zahlungserklärung.
    status: varchar('status', { length: 20 }).notNull().default('open'),
    zeDocumentNumber: varchar('ze_document_number', { length: 40 }),
    zeDocumentId: uuid('ze_document_id').references(() => documents.id),
    zeS3Key: varchar('ze_s3_key', { length: 500 }),
    zeSha256: varchar('ze_sha256', { length: 64 }),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    signerIp: varchar('signer_ip', { length: 64 }),
    auditRecord: jsonb('audit_record'),
    // A1–A3 e-mail sent for this event ('A1' | 'A3' | 'none').
    notifiedKind: varchar('notified_kind', { length: 10 }),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('payout_releases_claim_id_idx').on(table.claimId),
    statusIdx: index('payout_releases_status_idx').on(table.status),
  })
);

export const payoutDecisionsRelations = relations(
  payoutDecisions,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [payoutDecisions.claimId],
      references: [claimsTable.id],
    }),
    document: one(documents, {
      fields: [payoutDecisions.documentId],
      references: [documents.id],
    }),
  })
);

export const payoutReleasesRelations = relations(payoutReleases, ({ one }) => ({
  claim: one(claimsTable, {
    fields: [payoutReleases.claimId],
    references: [claimsTable.id],
  }),
  zeDocument: one(documents, {
    fields: [payoutReleases.zeDocumentId],
    references: [documents.id],
  }),
}));

export const payoutCustomerInputsRelations = relations(
  payoutCustomerInputs,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [payoutCustomerInputs.claimId],
      references: [claimsTable.id],
    }),
    decision: one(payoutDecisions, {
      fields: [payoutCustomerInputs.decisionId],
      references: [payoutDecisions.id],
    }),
  })
);
