import { pgSchema, uuid, varchar, boolean, timestamp, jsonb, decimal, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './shared';

export const vbl = pgSchema('vbl');

export const applications = vbl.table('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: varchar('status', { length: 50 }).default('draft'), // 'draft', 'ready', 'submitted', 'printed', 'dispatched'

  // Employment data
  employerName: varchar('employer_name', { length: 255 }),
  employmentStart: date('employment_start'),
  employmentEnd: date('employment_end'),
  isWestGermany: boolean('is_west_germany'),
  monthsContributed: integer('months_contributed'),
  vblInsuranceNumber: varchar('vbl_insurance_number', { length: 50 }),

  // Calculation
  calculationMethod: varchar('calculation_method', { length: 20 }), // 'pre2018' or 'post2018'
  baseRefundAmount: decimal('base_refund_amount', { precision: 10, scale: 2 }),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),

  // Payment
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'), // 'pending', 'paid', 'failed', 'refunded'
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Submission
  lettershopSubmissionId: varchar('lettershop_submission_id', { length: 255 }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  pdfS3Key: varchar('pdf_s3_key', { length: 500 }),

  // Workflow
  workflowState: varchar('workflow_state', { length: 50 }).default('draft'),
  workflowHistory: jsonb('workflow_history').default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const calculationLogs = vbl.table('calculation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').references(() => applications.id),
  inputData: jsonb('input_data').notNull(),
  rulesVersion: varchar('rules_version', { length: 20 }),
  calculationResult: jsonb('calculation_result').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const workflowStates = vbl.table('workflow_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  state: varchar('state', { length: 50 }).notNull(),
  previousState: varchar('previous_state', { length: 50 }),
  triggeredBy: varchar('triggered_by', { length: 50 }), // 'user', 'system', 'admin'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  calculationLogs: many(calculationLogs),
  workflowStates: many(workflowStates),
}));

export const calculationLogsRelations = relations(calculationLogs, ({ one }) => ({
  application: one(applications, {
    fields: [calculationLogs.applicationId],
    references: [applications.id],
  }),
}));

export const workflowStatesRelations = relations(workflowStates, ({ one }) => ({
  application: one(applications, {
    fields: [workflowStates.applicationId],
    references: [applications.id],
  }),
}));
