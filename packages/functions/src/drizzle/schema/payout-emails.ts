/**
 * Escrow payout e-mails and admin follow-ups (migration 0032, owner spec
 * 30 Oct 2026, services/payout-emails).
 *
 *  - `payout_email_log`: one row per milestone and business event. The
 *    unique `event_key` (e.g. `E1A:<releaseId>`, `E2A:<releaseId>:7`) is
 *    claimed before sending, so a repeated event or an edited template
 *    never resends a completed milestone. A failed send deletes its row
 *    and the next run retries.
 *  - `payout_tasks`: admin tasks the timers and events open (missing
 *    funds, missing decision, overdue review, incomplete transfer record,
 *    …). `dedupe_key` keeps one task per case event.
 */

import {
  boolean,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { claims, claimsTable } from './claims';

export const payoutEmailLog = claims.table(
  'payout_email_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    releaseId: uuid('release_id'),
    template: varchar('template', { length: 10 }).notNull(),
    eventKey: varchar('event_key', { length: 200 }).notNull(),
    templateVersion: varchar('template_version', { length: 20 }).notNull(),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    bcc: varchar('bcc', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('sending'), // sending | sent
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    eventKeyUq: uniqueIndex('payout_email_log_event_key_uq').on(t.eventKey),
    claimIdx: index('payout_email_log_claim_idx').on(t.claimId),
  })
);

export const PAYOUT_TASK_KINDS = [
  'missing_funds',
  'missing_decision',
  'review_late_document',
  'review_overdue',
  'review_issue',
  'no_signature',
  'transfer_record_incomplete',
  'payment_not_received',
  'email_fields_missing',
  'decision_upload',
] as const;
export type PayoutTaskKind = (typeof PAYOUT_TASK_KINDS)[number];

export const payoutTasks = claims.table(
  'payout_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    releaseId: uuid('release_id'),
    kind: varchar('kind', { length: 40 }).notNull(), // PayoutTaskKind
    dedupeKey: varchar('dedupe_key', { length: 200 }).notNull(),
    urgent: boolean('urgent').notNull().default(false),
    detail: text('detail'),
    status: varchar('status', { length: 10 }).notNull().default('open'), // open | done
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by'),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    dedupeUq: uniqueIndex('payout_tasks_dedupe_key_uq').on(t.dedupeKey),
    statusIdx: index('payout_tasks_status_idx').on(t.status),
  })
);

export type PayoutEmailLogRow = typeof payoutEmailLog.$inferSelect;
export type PayoutTaskRow = typeof payoutTasks.$inferSelect;
