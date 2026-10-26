/**
 * Client-update engine ("Rules for Karl", Client Update Texts FINAL
 * 16 Sep 2026): the contact log, the draft/send tasks for the named
 * client account manager, letters the client received directly, and the
 * documents a client uploads against an open customer task.
 *
 * The case fields that live on `claims.claims` itself (pension_office,
 * submission_date, communication_owner, next_client_update_due,
 * last_client_update_sent, open_customer_task, next_office_action,
 * decision_received_at, funds_received_at, …) are added by migration 0017.
 * `claims.ts` is owned by another stream, so the Drizzle view of those
 * columns lives in `services/client-updates/case-columns.ts` (outside the
 * drizzle-kit schema glob, which rejects a second table object for the same
 * physical table).
 */

import {
  boolean,
  date,
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

// Contact-log channel and type (Rules for Karl, "Case fields").
export const CONTACT_CHANNELS = ['phone', 'written', 'portal'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const CONTACT_TYPES = [
  'status_enquiry',
  'office_reply',
  'unsuccessful_attempt',
  'written_reminder',
  'complaint',
  'info_request',
  'documents_forwarded',
  'transfer',
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

// M4 status paragraph keys (one is inserted into M4 after an office_reply).
export const M4_STATUS_PARAGRAPHS = [
  'application_complete',
  'estimated_decision_date',
  'additional_information',
  'estimate_has_passed',
  'no_substantive_reply',
] as const;
export type M4StatusParagraph = (typeof M4_STATUS_PARAGRAPHS)[number];

// info_request → who supplies the answer. 'customer' → E2A, 'file' → E2B,
// 'originals_oldenburg' → the DRV Oldenburg-Bremen originals mail.
export const INFO_REQUEST_SOURCES = [
  'customer',
  'file',
  'originals_oldenburg',
] as const;
export type InfoRequestSource = (typeof INFO_REQUEST_SOURCES)[number];

// Every client e-mail the engine can draft.
export const CLIENT_UPDATE_TEMPLATES = [
  'T1',
  'M0',
  'M1',
  'M2',
  'M3A',
  'M3B',
  'M3_ONWARD',
  'M4',
  'M5',
  'M6A',
  'M6B',
  'M6_ONWARD',
  'E1',
  'E2A',
  'E2B',
  'E3',
  'OB_ORIGINALS',
] as const;
export type ClientUpdateTemplate = (typeof CLIENT_UPDATE_TEMPLATES)[number];

export const CLIENT_UPDATE_TASK_KINDS = [
  'client_update_draft', // draft e-mail for the communication owner
  'senior_review', // + 6 months review, assigned to the named reviewer
] as const;
export type ClientUpdateTaskKind = (typeof CLIENT_UPDATE_TASK_KINDS)[number];

export const CLIENT_UPDATE_TASK_STATUSES = [
  'open',
  'sent',
  'superseded',
  'cancelled',
  'done',
] as const;
export type ClientUpdateTaskStatus =
  (typeof CLIENT_UPDATE_TASK_STATUSES)[number];

// Shape of claims.claims.open_customer_task (jsonb). Never shown next to
// "Nothing at the moment".
export interface OpenCustomerTask {
  id: string;
  text: string;
  dueDate: string | null; // YYYY-MM-DD
  button: string; // e.g. "Upload requested documents"
  contactLogId: string | null;
  createdAt: string;
  documentsReceivedAt?: string | null;
}

// Shape of claims.claims.next_office_action (jsonb).
export const OFFICE_ACTION_TYPES = [
  'status_enquiry',
  'written_reminder_review',
  'senior_review',
  'confirm_receipt_new_office',
  'send_response',
  'follow_up',
  'custom',
] as const;
export type OfficeActionType = (typeof OFFICE_ACTION_TYPES)[number];

export interface NextOfficeAction {
  id: string;
  type: OfficeActionType;
  label: string; // plain English, shown to the client as "what we are doing next"
  dueDate: string; // YYYY-MM-DD
  owner: string;
  status: 'open' | 'done' | 'rescheduled';
  reason?: string | null; // required when rescheduled
  completedAt?: string | null;
  contactLogId?: string | null;
}

/** Full contact history; latest entry shown in the overview. */
export const clientContactLog = claims.table(
  'client_contact_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    contactDate: date('contact_date').notNull(),
    loggedBy: uuid('logged_by').references(() => users.id),
    loggedByName: varchar('logged_by_name', { length: 100 }),
    channel: varchar('channel', { length: 20 }).notNull(), // ContactChannel
    type: varchar('type', { length: 30 }).notNull(), // ContactType
    outcome: text('outcome').notNull(), // factual
    summaryEn: text('summary_en'), // plain English, reused in the e-mail
    uncertain: boolean('uncertain').notNull().default(false),
    customerAction: text('customer_action'),
    customerActionDue: date('customer_action_due'),
    updateWarranted: boolean('update_warranted').notNull().default(false),
    // Template-specific facts. office_reply: which M4 paragraph;
    // info_request: who answers; transfer: the new office; everything
    // else: optional dates the e-mail needs (sent date, requested reply
    // date, estimated decision date, follow-up date).
    statusParagraph: varchar('status_paragraph', { length: 40 }),
    infoRequestSource: varchar('info_request_source', { length: 30 }),
    newOffice: varchar('new_office', { length: 255 }),
    details: jsonb('details').$type<Record<string, string | null>>(),
    // Set when a draft task was generated from this entry.
    templateKey: varchar('template_key', { length: 20 }),
    draftTaskId: uuid('draft_task_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('client_contact_log_claim_id_idx').on(table.claimId),
  })
);

/**
 * Tasks for the communication owner (draft ready ≥ 1 working day before the
 * promised date) and for the named reviewer at + 6 months. A draft task
 * closes only on a successful send.
 */
export const clientUpdateTasks = claims.table(
  'client_update_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 30 }).notNull(), // ClientUpdateTaskKind
    templateKey: varchar('template_key', { length: 20 }), // ClientUpdateTemplate
    trigger: varchar('trigger', { length: 40 }).notNull(), // 'scheduled' | 'submitted' | 'handoff' | 'contact' | 'milestone'
    contactLogId: uuid('contact_log_id').references(() => clientContactLog.id),
    assignedTo: varchar('assigned_to', { length: 100 }).notNull(),
    assignedToEmail: varchar('assigned_to_email', { length: 255 }),
    dueDate: date('due_date').notNull(), // the promised client date (or review date)
    draftSubject: text('draft_subject'),
    draftBody: text('draft_body'),
    draftHtml: text('draft_html'),
    unresolvedPlaceholders: jsonb('unresolved_placeholders')
      .$type<string[]>()
      .default([]),
    variables: jsonb('variables').$type<Record<string, string | null>>(),
    status: varchar('status', { length: 20 }).notNull().default('open'), // ClientUpdateTaskStatus
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sentBy: uuid('sent_by').references(() => users.id),
    sentSubject: text('sent_subject'),
    sentBody: text('sent_body'),
    promisedUpdateDate: date('promised_update_date'),
    supersededByTaskId: uuid('superseded_by_task_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('client_update_tasks_claim_id_idx').on(table.claimId),
    statusIdx: index('client_update_tasks_status_idx').on(table.status),
  })
);

/** A letter the client received directly and uploaded from the account. */
export const clientLetters = claims.table(
  'client_letters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    receivedDate: date('received_date'),
    note: text('note'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('client_letters_claim_id_idx').on(table.claimId),
  })
);

/** Documents uploaded by the client against an open customer task. */
export const clientTaskDocuments = claims.table(
  'client_task_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    customerTaskId: uuid('customer_task_id').notNull(), // OpenCustomerTask.id
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('client_task_documents_claim_id_idx').on(table.claimId),
    taskIdx: index('client_task_documents_task_id_idx').on(
      table.customerTaskId
    ),
  })
);

export const clientContactLogRelations = relations(
  clientContactLog,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [clientContactLog.claimId],
      references: [claimsTable.id],
    }),
  })
);

export const clientUpdateTasksRelations = relations(
  clientUpdateTasks,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [clientUpdateTasks.claimId],
      references: [claimsTable.id],
    }),
    contact: one(clientContactLog, {
      fields: [clientUpdateTasks.contactLogId],
      references: [clientContactLog.id],
    }),
  })
);

export const clientLettersRelations = relations(clientLetters, ({ one }) => ({
  claim: one(claimsTable, {
    fields: [clientLetters.claimId],
    references: [claimsTable.id],
  }),
  document: one(documents, {
    fields: [clientLetters.documentId],
    references: [documents.id],
  }),
}));

export const clientTaskDocumentsRelations = relations(
  clientTaskDocuments,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [clientTaskDocuments.claimId],
      references: [claimsTable.id],
    }),
    document: one(documents, {
      fields: [clientTaskDocuments.documentId],
      references: [documents.id],
    }),
  })
);
