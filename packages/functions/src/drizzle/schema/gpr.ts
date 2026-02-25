import { pgSchema, uuid, varchar, boolean, timestamp, jsonb, decimal, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './shared';

export const gpr = pgSchema('gpr');

// Pre-registration table: Stores calculator + eligibility data before user account exists
// Keyed by email, upserts overwrite previous pending data (keep only latest)
export const pendingSessions = gpr.table('pending_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),

  // Calculator data
  numberOfJobs: integer('number_of_jobs').notNull(),
  jobs: jsonb('jobs').notNull(), // Array of JobData

  // Calculation result
  calculationResult: jsonb('calculation_result').notNull(),

  // Eligibility data
  citizenship: varchar('citizenship', { length: 100 }),
  residence: varchar('residence', { length: 100 }),
  lastEmploymentMonth: varchar('last_employment_month', { length: 20 }),
  lastEmploymentYear: varchar('last_employment_year', { length: 4 }),
  contributionDuration: varchar('contribution_duration', { length: 50 }),
  dateOfBirth: date('date_of_birth'),

  // Eligibility result
  eligibilityResult: jsonb('eligibility_result'),

  // Metadata
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),

  // Lifecycle
  expiresAt: timestamp('expires_at', { withTimezone: true }), // 7 days from creation
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Applications table: Full VBL parity for registered users
export const applications = gpr.table('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: varchar('status', { length: 50 }).default('draft'), // 'draft', 'ready', 'submitted', 'processing', 'completed'

  // Employment data (stored as JSONB for flexibility)
  numberOfJobs: integer('number_of_jobs'),
  jobs: jsonb('jobs'), // Full job details array
  totalMonthsContributed: integer('total_months_contributed'),
  earliestEmploymentStart: date('earliest_employment_start'),
  latestEmploymentEnd: date('latest_employment_end'),

  // Calculation results
  statePensionRefund: decimal('state_pension_refund', { precision: 10, scale: 2 }),
  supplementaryRefund: decimal('supplementary_refund', { precision: 10, scale: 2 }),
  totalRefund: decimal('total_refund', { precision: 10, scale: 2 }),
  calculationDetails: jsonb('calculation_details'),

  // Eligibility data
  citizenship: varchar('citizenship', { length: 100 }),
  residence: varchar('residence', { length: 100 }),
  eligibilityResult: jsonb('eligibility_result'),

  // Payment (VBL parity)
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'),
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Submission (VBL parity)
  lettershopSubmissionId: varchar('lettershop_submission_id', { length: 255 }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  pdfS3Key: varchar('pdf_s3_key', { length: 500 }),

  // Workflow (VBL parity)
  workflowState: varchar('workflow_state', { length: 50 }).default('draft'),
  workflowHistory: jsonb('workflow_history').default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Calculation logs for audit trail
export const calculationLogs = gpr.table('calculation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').references(() => applications.id),
  sessionId: uuid('session_id').references(() => pendingSessions.id),
  inputData: jsonb('input_data').notNull(),
  rulesVersion: varchar('rules_version', { length: 20 }),
  calculationResult: jsonb('calculation_result').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Workflow state transitions
export const workflowStates = gpr.table('workflow_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  state: varchar('state', { length: 50 }).notNull(),
  previousState: varchar('previous_state', { length: 50 }),
  triggeredBy: varchar('triggered_by', { length: 50 }), // 'user', 'system', 'admin'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const gprApplicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  calculationLogs: many(calculationLogs),
  workflowStates: many(workflowStates),
}));

export const gprCalculationLogsRelations = relations(calculationLogs, ({ one }) => ({
  application: one(applications, {
    fields: [calculationLogs.applicationId],
    references: [applications.id],
  }),
  session: one(pendingSessions, {
    fields: [calculationLogs.sessionId],
    references: [pendingSessions.id],
  }),
}));

export const gprWorkflowStatesRelations = relations(workflowStates, ({ one }) => ({
  application: one(applications, {
    fields: [workflowStates.applicationId],
    references: [applications.id],
  }),
}));
