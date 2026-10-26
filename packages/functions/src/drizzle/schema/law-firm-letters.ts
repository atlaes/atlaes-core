/**
 * Return channel (owner answer 6, 20 Oct 2026; Figma 05 "Return channel"
 * card). The law firm bulk-uploads scanned DRV letters in the portal,
 * without picking a case. Each file is OCR'd (Mistral), classified by
 * simple rules and matched within the firm's own cases. Migration 0029.
 *
 *  - status: 'matched' (one confident match, filed to the case),
 *    'needs_review' (OCR failed, name only, several or no cases — never
 *    auto-matched on a name alone), 'resolved' (ATLAES filed it by hand),
 *    'dismissed' (ATLAES decided it is not a case letter).
 *  - next_step_*: what ATLAES released after reading the letter (record
 *    the refund decision, notify the client, or mark handled). Nothing
 *    downstream starts automatically.
 *
 * "Needs attention" in the admin = needs_review, or filed with the next
 * step still pending.
 */

import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { claims, claimCorrespondence, claimsTable } from './claims';
import { documents, lawFirms, users } from './shared';

export const LETTER_STATUSES = [
  'matched',
  'needs_review',
  'resolved',
  'dismissed',
] as const;
export type LetterStatus = (typeof LETTER_STATUSES)[number];

export const LETTER_TYPES = [
  'refund_decision', // Bescheid über Beitragserstattung
  'document_request', // Anforderung / Rückfrage
  'rejection', // Ablehnung
  'other',
] as const;
export type LetterType = (typeof LETTER_TYPES)[number];

export const LETTER_MATCH_METHODS = ['vsnr_name', 'az', 'admin'] as const;
export type LetterMatchMethod = (typeof LETTER_MATCH_METHODS)[number];

export const LETTER_MATCH_REASONS = [
  'vsnr_name', // matched: VSNR of one case + its name in the letter
  'az', // matched: the firm's Aktenzeichen of one case
  'vsnr_without_name', // VSNR fits one case, but its name is not in the letter
  'name_only', // only a client name fits — never auto-matched
  'ambiguous', // several cases fit
  'conflict', // AZ and VSNR point at different cases
  'none', // nothing found
  'ocr_failed', // the file could not be read
] as const;
export type LetterMatchReason = (typeof LETTER_MATCH_REASONS)[number];

export const LETTER_NEXT_STEPS = [
  'record_decision',
  'notify_client',
  'mark_handled',
] as const;
export type LetterNextStep = (typeof LETTER_NEXT_STEPS)[number];

export interface LetterExtraction {
  vsnr: string[];
  az: string[];
  name: string | null;
  letterDate: string | null;
}

export const lawFirmLetters = claims.table(
  'law_firm_letters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lawFirmId: uuid('law_firm_id')
      .notNull()
      .references(() => lawFirms.id),
    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    documentId: uuid('document_id').references(() => documents.id, {
      onDelete: 'set null',
    }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileType: varchar('file_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    fileSha256: varchar('file_sha256', { length: 64 }).notNull(),
    s3Key: varchar('s3_key', { length: 500 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().$type<LetterStatus>(),
    ocrStatus: varchar('ocr_status', { length: 20 }).notNull(), // 'done' | 'failed'
    ocrError: text('ocr_error'),
    ocrText: text('ocr_text'),
    extracted: jsonb('extracted').$type<LetterExtraction>(),
    letterType: varchar('letter_type', { length: 30 })
      .notNull()
      .default('other')
      .$type<LetterType>(),
    matchMethod: varchar('match_method', {
      length: 20,
    }).$type<LetterMatchMethod>(),
    matchReason: varchar('match_reason', { length: 30 })
      .notNull()
      .$type<LetterMatchReason>(),
    claimId: uuid('claim_id').references(() => claimsTable.id, {
      onDelete: 'set null',
    }),
    candidateClaimIds: jsonb('candidate_claim_ids').$type<string[]>(),
    correspondenceId: uuid('correspondence_id').references(
      () => claimCorrespondence.id,
      { onDelete: 'set null' }
    ),
    nextStepStatus: varchar('next_step_status', { length: 20 }), // 'pending' | 'done'
    nextStepAction: varchar('next_step_action', {
      length: 30,
    }).$type<LetterNextStep>(),
    handledBy: uuid('handled_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    handledNote: text('handled_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    firmIdx: index('law_firm_letters_firm_idx').on(t.lawFirmId, t.createdAt),
    attentionIdx: index('law_firm_letters_attention_idx').on(
      t.status,
      t.nextStepStatus
    ),
    claimIdx: index('law_firm_letters_claim_idx').on(t.claimId),
    hashIdx: index('law_firm_letters_hash_idx').on(t.lawFirmId, t.fileSha256),
  })
);
