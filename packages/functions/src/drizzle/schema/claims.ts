import {
  pgSchema,
  index,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
  decimal,
  date,
  text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, documents, signatures, lawFirms } from './shared';
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
  | 'employment' // bAV cash-out
  | 'cashOutBasis' // bAV cash-out
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

// Document roles for claim documents. Single source of truth — the route
// validators derive their enums from this list.
export const CLAIM_DOCUMENT_ROLES = [
  'passport',
  'payslip',
  'abmeldung',
  'bank_statement',
  'certified_id_form',
  'health_insurance',
  // bAV cash-out (private-sector company pension) enclosures, see the
  // client's "bAV-Abfindung Standardschreiben" spec section 9.8.
  'drv_refund_decision', // DRV Erstattungsbescheid (§ 210 SGB VI), route A
  'pension_statement', // Standmitteilung / Renteninformation / Versicherungsschein
  'provider_form', // provider's own Abfindung application form, signed
  'employer_consent', // employer's signed consent (e.g. BVV "Zustimmung Arbeitgeber")
  'employment_end_proof', // Kündigungsbestätigung, Arbeitszeugnis, last payslip
  'foreign_health_insurance', // insurance card/certificate from residence country
  'bank_proof', // bank confirmation letter
] as const;
export type ClaimDocumentRole = (typeof CLAIM_DOCUMENT_ROLES)[number];

// Which claim product the row belongs to. 'public' = VBL/ZVK/VddB/VddKO
// refund, 'private' = bAV cash-out (Abfindung). Null on legacy rows.
export type PensionType = 'public' | 'private';

// Formal address used in German letters. Required for bAV letters (the
// templates only have Herr/Frau forms); derived from passport gender where
// that is male/female, otherwise asked explicitly.
export type Salutation = 'herr' | 'frau';

// bAV implementation vehicle (Durchführungsweg). Drives the addressee
// (Direktzusage/Unterstützungskasse → employer) and the § 4 Abs. 5 BetrAVG
// wording in the letters. Stored verbatim as the German term.
export const BAV_DURCHFUEHRUNGSWEGE = [
  'Direktversicherung',
  'Pensionskasse',
  'Pensionsfonds',
  'Direktzusage',
  'Unterstützungskasse',
] as const;
export type BavDurchfuehrungsweg = (typeof BAV_DURCHFUEHRUNGSWEGE)[number];

// Route B (§ 3 Abs. 2 BetrAVG): what the statement shows for the value at
// retirement age. 'unknown' when only the current Deckungskapital is known.
export type BavBenefitForm = 'pension' | 'capital' | 'unknown';

// Route B statement document type, as named in the letter.
export const BAV_STATEMENT_TYPES = [
  'Standmitteilung',
  'Renteninformation',
  'Austrittsmitteilung',
  'Versicherungsschein',
] as const;
export type BavStatementType = (typeof BAV_STATEMENT_TYPES)[number];

// Who the Abfindung letter is addressed to.
export type BavAddresseeType = 'employer' | 'provider';

// How a claim is handled after submission, decided manually by ops:
// 'direct' — CompanyPension prints/mails via the lettershop;
// 'law_firm' — the package is handed to the partner law firm (Vividius),
// who submits it themselves. Orthogonal to `status`.
export const CLAIM_HANDLING_ROUTES = ['direct', 'law_firm'] as const;

/**
 * Route a claim takes when ops have not chosen one explicitly (client
 * answer, 15 Sep 2026): every bAV cash-out ('private') goes via the partner
 * law firm; public-sector and stage refunds go direct. A stored
 * handling_route always wins; NULL means "not chosen" and resolves here.
 */
export function defaultHandlingRoute(
  pensionType: string | null | undefined
): (typeof CLAIM_HANDLING_ROUTES)[number] {
  return pensionType === 'private' ? 'law_firm' : 'direct';
}
export type ClaimHandlingRoute = (typeof CLAIM_HANDLING_ROUTES)[number];

// Where the Abfindung is paid out (law-firm handling only): the client's
// own account or the law firm's Anderkonto. Direct handling always pays
// the client.
export const CLAIM_PAYOUT_TARGETS = ['client', 'law_firm'] as const;
export type ClaimPayoutTarget = (typeof CLAIM_PAYOUT_TARGETS)[number];

// Law-firm case state, kept by the firm itself in the portal. Separate
// from `status`, which stays an ops decision. Linear: each event moves
// the case forward; ops can read it, never set it.
export const LAW_FIRM_CASE_STATES = [
  'new',
  'downloaded',
  'submitted',
  'response_received',
  'closed',
] as const;
export type LawFirmCaseState = (typeof LAW_FIRM_CASE_STATES)[number];

// Events the firm can record; each maps onto the case state above.
export const LAW_FIRM_CASE_EVENTS = [
  'downloaded',
  'submitted',
  'response_received',
  'closed',
] as const;
export type LawFirmCaseEvent = (typeof LAW_FIRM_CASE_EVENTS)[number];

// How the firm sent the package to the provider.
export const LAW_FIRM_SUBMISSION_CHANNELS = [
  'post',
  'email',
  'fax',
  'portal',
] as const;
export type LawFirmSubmissionChannel =
  (typeof LAW_FIRM_SUBMISSION_CHANNELS)[number];

// Correspondence stored on a claim (document exchange with the law firm).
export const CORRESPONDENCE_DIRECTIONS = [
  'package_out', // our package, handed to the firm
  'copy_out', // the copy print for the other party
  'provider_in', // incoming mail from the provider/employer
  'firm_note', // a note from the firm without a file
] as const;
export type CorrespondenceDirection =
  (typeof CORRESPONDENCE_DIRECTIONS)[number];

export const CORRESPONDENCE_SOURCES = [
  'portal_upload',
  'email',
  'ops',
] as const;
export type CorrespondenceSource = (typeof CORRESPONDENCE_SOURCES)[number];

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
export const claimsTable = claims.table(
  'claims',
  {
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
    healthInsuranceProviderAddress: varchar(
      'health_insurance_provider_address',
      {
        length: 500,
      }
    ),
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
    healthInsuranceCountryOfBirth: varchar(
      'health_insurance_country_of_birth',
      {
        length: 100,
      }
    ),
    healthInsuranceNumber: varchar('health_insurance_number', { length: 50 }),

    // Product discriminator: 'public' (VBL/ZVK refund) | 'private' (bAV
    // cash-out). Null on rows created before the column existed.
    pensionType: varchar('pension_type', { length: 20 }),

    // bAV cash-out intake (pension_type = 'private'). All nullable; the
    // submission validator enforces what each route needs. Placeholder names
    // in the client's letter spec are noted per column.
    salutation: varchar('salutation', { length: 10 }), // 'herr' | 'frau' → client_gender
    taxId: varchar('tax_id', { length: 20 }), // German Steuer-ID → tax_id
    healthInsuranceEndDate: date('health_insurance_end_date'), // → de_health_insurance_end_date (falls back to move_out_date)

    // Employment with the German employer that granted the bAV
    employerName: varchar('employer_name', { length: 255 }), // → employer_name
    employmentEndDate: date('employment_end_date'), // → employment_end_date
    employerPersonnelNumber: varchar('employer_personnel_number', {
      length: 50,
    }), // → employer_personnel_number

    // The bAV scheme itself
    bavProviderName: varchar('bav_provider_name', { length: 255 }), // → provider_name (empty for Direktzusage)
    bavDurchfuehrungsweg: varchar('bav_durchfuehrungsweg', { length: 30 }), // → durchfuehrungsweg
    bavContractReferenceLabel: varchar('bav_contract_reference_label', {
      length: 50,
    }), // → contract_reference_label ("Vertrags-Nr.", "Versicherungsnummer", …)
    bavContractReference: varchar('bav_contract_reference', { length: 100 }), // → contract_reference
    bavProviderFormTitle: varchar('bav_provider_form_title', { length: 255 }), // → provider_form_title (with a provider_form document)

    // Route A (§ 3 Abs. 3 BetrAVG): DRV contribution refund already granted
    drvRefundReceived: boolean('drv_refund_received'), // true → route A, false → route B
    drvOffice: varchar('drv_office', { length: 255 }), // → drv_office (from Bescheid OCR)
    drvDecisionDate: date('drv_decision_date'), // → drv_decision_date

    // Route B (§ 3 Abs. 2 BetrAVG): Kleinstanwartschaft per statement
    bavStatementType: varchar('bav_statement_type', { length: 50 }), // → statement_type
    bavStatementDate: date('bav_statement_date'), // → statement_date
    bavBenefitForm: varchar('bav_benefit_form', { length: 10 }), // 'pension' | 'capital' | 'unknown' → benefit_form
    bavBenefitAmount: decimal('bav_benefit_amount', {
      precision: 12,
      scale: 2,
    }), // → benefit_amount (EUR; monthly for pension, one-off for capital)

    // Letter addressee. Defaults come from the Durchführungsweg / provider
    // matrix; ops can override per claim.
    bavAddresseeType: varchar('bav_addressee_type', { length: 20 }), // 'employer' | 'provider' → addressee_type
    bavRecipientName: varchar('bav_recipient_name', { length: 255 }), // → recipient_name
    bavRecipientDepartment: varchar('bav_recipient_department', {
      length: 255,
    }), // → recipient_department
    bavRecipientStreet: varchar('bav_recipient_street', { length: 255 }), // → recipient_street
    bavRecipientPostalCode: varchar('bav_recipient_postal_code', {
      length: 20,
    }), // → recipient_postal_code
    bavRecipientCity: varchar('bav_recipient_city', { length: 100 }), // → recipient_city
    bavRecipientRef: varchar('bav_recipient_ref', { length: 100 }), // → recipient_ref ("Ihr Zeichen")

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
    identityVerifiedAt: timestamp('identity_verified_at', {
      withTimezone: true,
    }),

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
    lettershopSubmissionId: varchar('lettershop_submission_id', {
      length: 255,
    }),

    // Handling route (ops decision; see ClaimHandlingRoute). Submission reads
    // it: 'direct' goes to the lettershop, 'law_firm' parks the package for
    // the partner law firm. Set through PUT /api/admin/claims/:id/routing.
    // NULL = not chosen yet → defaultHandlingRoute(pensionType) applies.
    handlingRoute: varchar('handling_route', { length: 20 }),
    handlingRouteSetAt: timestamp('handling_route_set_at', {
      withTimezone: true,
    }),
    handlingRouteSetBy: uuid('handling_route_set_by').references(
      () => users.id
    ),
    payoutTarget: varchar('payout_target', { length: 20 }), // 'client' | 'law_firm' (law_firm handling only)
    lawFirmRef: varchar('law_firm_ref', { length: 100 }), // law firm's file number ("Unser Zeichen")

    // Law-firm assignment (set when handling switches to 'law_firm') and the
    // firm's own case state (see LawFirmCaseState). Scoped portal queries
    // filter on handling_route = 'law_firm' AND law_firm_id = <firm>.
    lawFirmId: uuid('law_firm_id').references(() => lawFirms.id),
    lawFirmAssignedAt: timestamp('law_firm_assigned_at', {
      withTimezone: true,
    }),
    lawFirmCaseState: varchar('law_firm_case_state', { length: 30 }),
    lawFirmDownloadedAt: timestamp('law_firm_downloaded_at', {
      withTimezone: true,
    }),
    lawFirmSubmittedAt: timestamp('law_firm_submitted_at', {
      withTimezone: true,
    }),
    lawFirmSubmissionChannel: varchar('law_firm_submission_channel', {
      length: 20,
    }),
    lawFirmResponseAt: timestamp('law_firm_response_at', {
      withTimezone: true,
    }),
    lawFirmClosedAt: timestamp('law_firm_closed_at', { withTimezone: true }),

    // Release to the firm (platform brief 2026-09-16): the firm sees a case
    // only between release and the saved submission date; ops can
    // re-release a submitted case for 48 hours. The overdue warning goes
    // out once when no submission date exists 7 days after the download.
    lawFirmReleasedAt: timestamp('law_firm_released_at', {
      withTimezone: true,
    }),
    lawFirmReleasedBy: uuid('law_firm_released_by').references(() => users.id),
    lawFirmRereleasedUntil: timestamp('law_firm_rereleased_until', {
      withTimezone: true,
    }),
    lawFirmOverdueWarnedAt: timestamp('law_firm_overdue_warned_at', {
      withTimezone: true,
    }),

    // DRV refund pack data (V0901/A1310/A1002) not covered by the intake
    // fields above; collected in the account flow before release.
    vsnr: varchar('vsnr', { length: 20 }),
    sex: varchar('sex', { length: 10 }), // 'male' | 'female' | 'none' | 'diverse'
    birthName: varchar('birth_name', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    germanContributionMonths: integer('german_contribution_months'),

    // Submission pack generated at the firm's first download and frozen as
    // the submitted version (later client-data corrections do not touch it).
    submissionPackS3Key: varchar('submission_pack_s3_key', { length: 500 }),
    submissionPackGeneratedAt: timestamp('submission_pack_generated_at', {
      withTimezone: true,
    }),
    submissionPackManifest: jsonb('submission_pack_manifest'),

    // Letter-only copy print for the other party (bAV packages), stored
    // next to pdf_s3_key so the firm can download both.
    copyPdfS3Key: varchar('copy_pdf_s3_key', { length: 500 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    lawFirmIdx: index('claims_law_firm_id_idx').on(table.lawFirmId),
  })
);

// Junction table linking claims to uploaded documents
export const claimDocuments = claims.table('claim_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  claimId: uuid('claim_id')
    .notNull()
    .references(() => claimsTable.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  documentRole: varchar('document_role', { length: 50 }).notNull(), // one of CLAIM_DOCUMENT_ROLES
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Document exchange with the law firm. Files reuse shared.documents with
// claim-scoped S3 keys (claims/<id>/correspondence/...), so ownership is
// tied to the claim, not the claimant. `documentId` is null for
// 'firm_note' rows.
export const claimCorrespondence = claims.table(
  'claim_correspondence',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => documents.id),
    direction: varchar('direction', { length: 20 }).notNull(), // CorrespondenceDirection
    source: varchar('source', { length: 20 }).notNull(), // CorrespondenceSource
    lawFirmId: uuid('law_firm_id').references(() => lawFirms.id),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    receivedDate: date('received_date'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    claimIdx: index('claim_correspondence_claim_id_idx').on(table.claimId),
  })
);

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
  correspondence: many(claimCorrespondence),
  lawFirm: one(lawFirms, {
    fields: [claimsTable.lawFirmId],
    references: [lawFirms.id],
  }),
}));

export const claimCorrespondenceRelations = relations(
  claimCorrespondence,
  ({ one }) => ({
    claim: one(claimsTable, {
      fields: [claimCorrespondence.claimId],
      references: [claimsTable.id],
    }),
    document: one(documents, {
      fields: [claimCorrespondence.documentId],
      references: [documents.id],
    }),
    uploader: one(users, {
      fields: [claimCorrespondence.uploadedBy],
      references: [users.id],
    }),
  })
);

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
