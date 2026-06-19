import { pgSchema, uuid, varchar, boolean, timestamp, jsonb, decimal, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './shared';

export const vbl = pgSchema('vbl');

// Pre-registration table: stores VBL calculator state before user account exists.
// Token-keyed (anonymous): created when user clicks Continue on the calculator's
// result screen, hydrated when the onboarding flow loads. Email is linked
// later via PATCH when the user submits the Create Account form.
// Expires after 7 days to limit PII retention.
export const pendingCalculatorSessions = vbl.table('pending_calculator_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: uuid('token').defaultRandom().notNull().unique(),

  // Calculator state
  jobs: jsonb('jobs').notNull(), // VBLJob[]
  calculationResult: jsonb('calculation_result'), // { totalRefund, breakdown, totalMonths } | null
  scenario: varchar('scenario', { length: 64 }), // 'private_may_be_possible' | 'eligible' | etc.

  // Calculator form metadata
  dateOfBirth: date('date_of_birth'),
  currentAge: integer('current_age'),
  userType: varchar('user_type', { length: 32 }),

  // Onboarding bridge fields (mirror existing sessionStorage `calculator-selection`)
  pensionProvider: varchar('pension_provider', { length: 100 }),
  claimTypes: jsonb('claim_types').$type<string[]>(), // ['public', 'private', 'stage']
  publicStageProvider: varchar('public_stage_provider', { length: 100 }),
  privateProvider: varchar('private_provider', { length: 100 }),

  // Linked email (set on Create Account submit; nullable until then)
  email: varchar('email', { length: 255 }),

  // Audit
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),

  // Lifecycle
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type VBLPendingCalculatorSession = typeof pendingCalculatorSessions.$inferSelect;
export type NewVBLPendingCalculatorSession = typeof pendingCalculatorSessions.$inferInsert;

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
