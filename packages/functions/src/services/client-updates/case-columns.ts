/**
 * Drizzle view of the client-update case fields on `claims.claims`
 * (migration 0017) plus the existing columns the engine reads.
 *
 * `drizzle/schema/claims.ts` is owned by another stream, and drizzle-kit
 * refuses a second table object for the same physical table inside its
 * schema glob, so this object lives here (outside `drizzle/schema/`) and
 * is never exported from the schema index. Queries run against the same
 * `claims.claims` rows as `claimsTable`; use it only for these columns.
 */

import {
  boolean,
  date,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type {
  NextOfficeAction,
  OpenCustomerTask,
} from '../../drizzle/schema/client-updates';

const claimsSchema = pgSchema('claims');

export const claimCase = claimsSchema.table('claims', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  status: varchar('status', { length: 50 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  handlingRoute: varchar('handling_route', { length: 20 }),
  lawFirmReleasedAt: timestamp('law_firm_released_at', { withTimezone: true }),
  lawFirmAssignedAt: timestamp('law_firm_assigned_at', { withTimezone: true }),
  lawFirmSubmittedAt: timestamp('law_firm_submitted_at', {
    withTimezone: true,
  }),
  drvOffice: varchar('drv_office', { length: 255 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),

  // Migration 0017
  pensionOffice: varchar('pension_office', { length: 255 }),
  submissionDate: date('submission_date'),
  communicationOwner: varchar('communication_owner', { length: 100 }),
  communicationOwnerEmail: varchar('communication_owner_email', {
    length: 255,
  }),
  reviewerName: varchar('reviewer_name', { length: 100 }),
  reviewerRole: varchar('reviewer_role', { length: 60 }),
  caseManagerSignature: text('case_manager_signature'),
  nextClientUpdateDue: date('next_client_update_due'),
  lastClientUpdateSent: date('last_client_update_sent'),
  openCustomerTask: jsonb('open_customer_task').$type<OpenCustomerTask>(),
  nextOfficeAction: jsonb('next_office_action').$type<NextOfficeAction>(),
  decisionReceivedAt: timestamp('decision_received_at', {
    withTimezone: true,
  }),
  fundsReceivedAt: timestamp('funds_received_at', { withTimezone: true }),
  fundsBeforeDecision: boolean('funds_before_decision')
    .notNull()
    .default(false),
  clientUpdateStoppedAt: timestamp('client_update_stopped_at', {
    withTimezone: true,
  }),
  clientUpdateStopReason: varchar('client_update_stop_reason', { length: 20 }),
  seniorReviewTaskCreatedAt: timestamp('senior_review_task_created_at', {
    withTimezone: true,
  }),
});

export type ClaimCaseRow = typeof claimCase.$inferSelect;

export const DEFAULT_COMMUNICATION_OWNER = 'Trixie';
