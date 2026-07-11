import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  decimal,
  date,
  text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, documents, signatures } from './shared';
import { applications as gprApplications } from './gpr';

export const claims = pgSchema('claims');

// Step names for completedSteps tracking
export type ClaimStepName =
  | 'claimType'
  | 'passportUpload'
  | 'currentAddress'
  | 'germanSocialInsurance'
  | 'lastAddressInGermany'
  | 'healthInsurance'
  | 'bankDetails'
  | 'signDocuments'
  | 'identityConfirmationForm'
  | 'reviewInformation'
  | 'finalConfirmation';

// Workflow states for claims
export type ClaimWorkflowState =
  | 'personal_info'
  | 'documents'
  | 'payment_details'
  | 'signature'
  | 'id_verification'
  | 'review'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'rejected';

// Claim status
export type ClaimStatus =
  | 'draft'
  | 'ready'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'rejected';

// Document roles for claim documents
export type ClaimDocumentRole =
  | 'passport'
  | 'payslip'
  | 'abmeldung'
  | 'bank_statement'
  | 'certified_id_form'
  | 'health_insurance';

// Task 15: type of health insurance selected/confirmed on the Health
// Insurance substep (bAV/private pension type only).
export type HealthInsuranceType = 'statutory' | 'private' | 'not_sure';

// Certifying authority types for identity verification
export type CertifyingAuthority =
  | 'notary_public'
  | 'local_government'
  | 'bank_branch'
  | 'police'
  | 'embassy'
  | 'justice_of_peace';

// Main claims table
export const claimsTable = claims.table('claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  applicationId: uuid('application_id').references(() => gprApplications.id), // Link to GPR calculator results

  // Status & Workflow
  status: varchar('status', { length: 50 }).default('draft'), // draft, ready, submitted, processing, completed, rejected
  workflowState: varchar('workflow_state', { length: 50 }).default(
    'personal_info'
  ),
  workflowHistory: jsonb('workflow_history').default([]),
  completedSteps: jsonb('completed_steps').default({}), // Track each sub-step completion for navigation

  // Section 1: Personal Information - Claim Type
  claimType: varchar('claim_type', { length: 50 }), // 'own_refund' | 'surviving_spouse'

  // Section 1: Personal Information - Passport Data (OCR extracted)
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }), // 'male' | 'female' | 'other'
  placeOfBirth: varchar('place_of_birth', { length: 100 }),
  nationality: varchar('nationality', { length: 100 }),
  passportNumber: varchar('passport_number', { length: 50 }),
  passportIssueDate: date('passport_issue_date'),
  passportExpiryDate: date('passport_expiry_date'),

  // Section 1: Personal Information - Current Address
  currentAddressLine1: varchar('current_address_line1', { length: 255 }),
  currentAddressLine2: varchar('current_address_line2', { length: 255 }),
  currentCity: varchar('current_city', { length: 100 }),
  currentPostalCode: varchar('current_postal_code', { length: 20 }),
  currentCountry: varchar('current_country', { length: 100 }),

  // Section 1: Personal Information - German Social Insurance
  svNummer: varchar('sv_nummer', { length: 50 }), // Optional

  // Section 2: Documents - Last German Address
  germanStreet: varchar('german_street', { length: 255 }),
  germanPostalCode: varchar('german_postal_code', { length: 20 }),
  germanCity: varchar('german_city', { length: 100 }),
  moveOutDate: date('move_out_date'),
  abmeldungMethod: varchar('abmeldung_method', { length: 50 }), // 'uploaded' | 'manual' | 'service_requested'
  deregistrationServiceRequested: boolean(
    'deregistration_service_requested'
  ).default(false), // €50 service

  // Task 15: Health Insurance (bAV/private pension type only). All
  // nullable — OCR-extracted or manually confirmed on the substep.
  healthInsuranceType: varchar('health_insurance_type', { length: 20 }), // 'statutory' | 'private' | 'not_sure'
  healthInsuranceProviderName: varchar('health_insurance_provider_name', {
    length: 255,
  }),
  healthInsuranceProviderAddress: varchar('health_insurance_provider_address', {
    length: 500,
  }),
  healthInsuranceInsuredSinceMonth: varchar(
    'health_insurance_insured_since_month',
    { length: 20 }
  ),
  healthInsuranceInsuredSinceYear: varchar(
    'health_insurance_insured_since_year',
    { length: 4 }
  ),
  healthInsurancePlaceOfBirth: varchar('health_insurance_place_of_birth', {
    length: 100,
  }),
  healthInsuranceCountryOfBirth: varchar('health_insurance_country_of_birth', {
    length: 100,
  }),
  healthInsuranceNumber: varchar('health_insurance_number', { length: 50 }),

  // Section 3: Payment Details - Bank Details
  preferredCurrency: varchar('preferred_currency', { length: 10 }), // 'AUD', 'EUR', 'USD', etc.
  accountHolderName: varchar('account_holder_name', { length: 255 }),
  bankName: varchar('bank_name', { length: 255 }),
  accountNumber: varchar('account_number', { length: 50 }),
  bsb: varchar('bsb', { length: 20 }), // Australian bank state branch
  swiftBic: varchar('swift_bic', { length: 20 }),
  iban: varchar('iban', { length: 50 }), // For EU banks
  bankStreet: varchar('bank_street', { length: 255 }),
  bankCity: varchar('bank_city', { length: 100 }),
  bankPostalCode: varchar('bank_postal_code', { length: 20 }),
  bankCountry: varchar('bank_country', { length: 100 }),

  // Section 4: Signature
  signatureId: uuid('signature_id').references(() => signatures.id),
  signatureCompletedAt: timestamp('signature_completed_at', {
    withTimezone: true,
  }),

  // Section 5: ID Verification
  identityFormDownloadedAt: timestamp('identity_form_downloaded_at', {
    withTimezone: true,
  }),
  certifyingAuthority: varchar('certifying_authority', { length: 50 }), // Type of authority that certified identity
  identityVerifiedAt: timestamp('identity_verified_at', { withTimezone: true }),

  // Section 6: Review & Submit - Confirmations
  confirmationAccuracyAccepted: boolean(
    'confirmation_accuracy_accepted'
  ).default(false),
  confirmationAuthorizationAccepted: boolean(
    'confirmation_authorization_accepted'
  ).default(false),

  // Payment tracking (VBL/GPR parity)
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'),
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
  serviceFee: decimal('service_fee', { precision: 10, scale: 2 }), // For deregistration service (€50)
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Submission
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  pdfS3Key: varchar('pdf_s3_key', { length: 500 }),
  lettershopSubmissionId: varchar('lettershop_submission_id', { length: 255 }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Junction table linking claims to uploaded documents
export const claimDocuments = claims.table('claim_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  claimId: uuid('claim_id')
    .notNull()
    .references(() => claimsTable.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  documentRole: varchar('document_role', { length: 50 }).notNull(), // 'passport', 'payslip', 'abmeldung', 'bank_statement', 'certified_id_form', 'health_insurance'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Workflow state transitions for audit trail
export const claimWorkflowStates = claims.table('claim_workflow_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  claimId: uuid('claim_id')
    .notNull()
    .references(() => claimsTable.id, { onDelete: 'cascade' }),
  state: varchar('state', { length: 50 }).notNull(),
  previousState: varchar('previous_state', { length: 50 }),
  triggeredBy: varchar('triggered_by', { length: 50 }), // 'user', 'system', 'admin'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// EU-legal electronic contract withdrawal. One row per withdrawn claim
// (unique on claim_id), created only when the user confirms the withdrawal
// on the second confirmation screen — via either the public identification
// path or the logged-in path. Stores the EXACT declaration wording shown to
// the user plus the immutable policy version, so the record is self-contained
// legal evidence of what was agreed and when. The revocation-task columns are
// nullable ops fields, filled in later when CompanyPension actually notifies
// the pension institution that its Postempfangsvollmacht (authority to
// receive correspondence) has been revoked.
export const contractWithdrawals = claims.table('contract_withdrawals', {
  id: uuid('id').defaultRandom().primaryKey(),
  // A withdrawal always resolves to a real claim (public identification only
  // succeeds when it matches one), and every claim has an owner user, so both
  // are NOT NULL. userId records WHOSE claim was withdrawn (the claim owner),
  // which keeps the record attributable and auditable even on the public,
  // unauthenticated path — it does not assert the actor was logged in (the
  // path is recorded separately in the audit log / metadata).
  // Unique — prevents a duplicate withdrawal for the same claim.
  claimId: uuid('claim_id')
    .notNull()
    .unique()
    .references(() => claimsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),

  // Snapshot of the identified contract details shown to the user.
  fullName: varchar('full_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  pensionTypeOrInstitution: varchar('pension_type_or_institution', {
    length: 255,
  }),
  contractDate: timestamp('contract_date', { withTimezone: true }), // when the CompanyPension contract/claim was created
  paymentDate: timestamp('payment_date', { withTimezone: true }), // claim.paidAt at withdrawal time

  // Immutable legal snapshot.
  policyVersion: varchar('policy_version', { length: 100 }).notNull(),
  declarationText: text('declaration_text').notNull(), // exact rendered wording shown to the user
  applicationAlreadySubmitted: boolean('application_already_submitted')
    .notNull()
    .default(false),

  // Postempfangsvollmacht / POA revocation task. `revocationRequired` is set
  // when the refund application (and thus the correspondence authorization)
  // had already been submitted at withdrawal time; the remaining columns are
  // filled in by ops when the revocation notice is actually sent.
  revocationRequired: boolean('revocation_required').notNull().default(false),
  revocationTaskCreatedAt: timestamp('revocation_task_created_at', {
    withTimezone: true,
  }),
  revocationMethodSent: varchar('revocation_method_sent', { length: 50 }), // 'post' | 'email' | 'fax' | ...
  revocationInstitution: varchar('revocation_institution', { length: 255 }),
  revocationDestination: varchar('revocation_destination', { length: 500 }), // address / email the notice was sent to
  revocationNoticeCopy: text('revocation_notice_copy'), // copy of the notice text sent
  revocationDeliveryStatus: varchar('revocation_delivery_status', {
    length: 50,
  }), // 'pending' | 'sent' | 'delivered' | 'failed' | ...

  // When the withdrawal was received (declaration effective time).
  receivedAt: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const contractWithdrawalsRelations = relations(
  contractWithdrawals,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [contractWithdrawals.claimId],
      references: [claimsTable.id],
    }),
    user: one(users, {
      fields: [contractWithdrawals.userId],
      references: [users.id],
    }),
  })
);

export const claimsTableRelations = relations(claimsTable, ({ one, many }) => ({
  user: one(users, {
    fields: [claimsTable.userId],
    references: [users.id],
  }),
  gprApplication: one(gprApplications, {
    fields: [claimsTable.applicationId],
    references: [gprApplications.id],
  }),
  signature: one(signatures, {
    fields: [claimsTable.signatureId],
    references: [signatures.id],
  }),
  documents: many(claimDocuments),
  workflowStates: many(claimWorkflowStates),
}));

export const claimDocumentsRelations = relations(claimDocuments, ({ one }) => ({
  claim: one(claimsTable, {
    fields: [claimDocuments.claimId],
    references: [claimsTable.id],
  }),
  document: one(documents, {
    fields: [claimDocuments.documentId],
    references: [documents.id],
  }),
}));

export const claimWorkflowStatesRelations = relations(
  claimWorkflowStates,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [claimWorkflowStates.claimId],
      references: [claimsTable.id],
    }),
  })
);
