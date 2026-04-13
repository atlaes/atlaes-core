# Admin Dashboard Development Guide

## 1. Overview

### Purpose

This document translates Johannes's 15-point feedback on the admin dashboard v1 into an actionable development plan. Each feature is mapped against the original contract scope (`Unified_Proposal_4_Platforms_VBL_GPR_RPT_DIY.md`) and tagged as **In Scope**, **Partially In Scope**, or **New Scope**.

### Stakeholder Source

All requirements originate from Johannes (ATLAES GmbH) following his review of the admin dashboard v1. His feedback requests evolving the dashboard from a basic claim viewer into a **generic multi-product operations system** supporting all 4 platforms.

### Product Naming Update

Per Johannes: the VBL product line is now referred to as **Company Pension** (customer-facing). Internal code references remain `vbl` / `claims` for backward compatibility. The admin dashboard should use the customer-facing names:

| Internal Code | Customer-Facing Name |
|---------------|---------------------|
| `vbl` / `claims` | Company Pension |
| `gpr` | Germany Pension Refund |
| `rpt` | Retirement Pension |
| `diy` | DIY German Pension Refund |

### Billing Model Change

The original proposal specified **€89 per year worked + VAT** for VBL. The current model (per Johannes) is:

- **€199 deposit** paid upfront (refundable if claim rejected)
- **9.75% service fee** on the refund amount
- Deposit is credited toward the service fee
- If fee > deposit → user pays the difference
- If fee ≤ deposit → no further payment
- If claim rejected → deposit is refunded

All billing specs in this document use the current model.

---

## 2. Current State (v1)

### What's Built

| Area | Status | Notes |
|------|--------|-------|
| Claims list with pagination | Done | Status filter tabs (All/Submitted/Processing/Completed/Rejected) |
| Stats dashboard cards | Done | Total, Submitted, Processing, Completed, Rejected counts |
| Claim detail page | Done | Personal info, addresses, bank details, payment, documents, notes |
| Status transitions | Done | submitted → processing → completed/rejected |
| Admin notes | Done | Free-text notes stored as workflow entries |
| Document download | Done | Pre-signed S3 URLs |
| Auth (magic link) | Done | Admin-only role check on JWT |

### Key Files

**Frontend (`apps/admin/`)**

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with Providers wrapper |
| `app/page.tsx` | Login page |
| `app/claims/page.tsx` | Claims list with stats cards, status tabs, pagination |
| `app/claims/[id]/page.tsx` | Claim detail: personal info, addresses, bank, payment, docs, notes/workflow |
| `lib/admin-api.ts` | API client functions + TypeScript interfaces |
| `lib/api.ts` | Axios instance with auth interceptor |
| `contexts/AuthContext.tsx` | Admin auth context (magic link flow, JWT decode, role check) |

**Backend (`packages/functions/`)**

| File | Purpose |
|------|---------|
| `src/routes/admin.ts` | All admin API routes |
| `src/middleware/admin.ts` | Role check (`user.role === 'admin'`) |
| `src/services/claims-application.ts` | Business logic for claims CRUD, stats, workflow |
| `src/stripe-webhook.ts` | Stripe EventBridge handler for payment events |

### Current API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/stats` | Dashboard stats (counts by status) |
| `GET` | `/api/admin/claims` | Paginated claims list (filter by `status`) |
| `GET` | `/api/admin/claims/:id` | Claim detail + documents + workflow + user info |
| `GET` | `/api/admin/claims/:id/documents` | Claim documents list |
| `GET` | `/api/admin/claims/:id/documents/:docId/download` | Pre-signed download URL |
| `GET` | `/api/admin/claims/:id/workflow` | Workflow history |
| `PUT` | `/api/admin/claims/:id/status` | Update claim status (with optional note) |
| `POST` | `/api/admin/claims/:id/notes` | Add admin note |

### Current DB Schema

**`claims.claims`** — Main claims table with personal info, addresses, bank details, payment tracking, submission data, timestamps.

**`claims.claim_documents`** — Junction table linking claims to documents (with `documentRole`).

**`claims.claim_workflow_states`** — Audit trail of state transitions (state, previousState, triggeredBy, metadata).

**`shared.users`** — User accounts with `role` field (currently just `'user'` or `'admin'`).

**`shared.documents`** — Document metadata with OCR data, confidence scores, S3 keys.

**`shared.audit_logs`** — Basic audit logging (action, resource, resourceId, details, IP, user agent).

### Current Claim Statuses

```
draft → ready → submitted → processing → completed
                                       → rejected
```

---

## 3. Scope Alignment Table

Reference: `Unified_Proposal_4_Platforms_VBL_GPR_RPT_DIY.md`

| # | Feature | Scope Status | Rationale |
|---|---------|:------------:|-----------|
| 1 | Search & Filters | **Partially In Scope** | Proposal includes "Admin Dashboard" at 85% reusability with "user mgmt, analytics." Basic listing is implied. Advanced full-text search, multi-field filtering, and saved views are new. |
| 2 | Internal Status Workflow | **Partially In Scope** | Proposal defines platform-specific workflows (VBL: 5 steps, GPR: 12 steps, RPT: 10 steps, DIY: 8 steps). A 15-status internal ops workflow that spans all products is new. |
| 3 | Enriched Claim Header | **Partially In Scope** | Proposal scopes claim detail pages. Storing the eligibility/calculator snapshot is new. |
| 4 | Enhanced Documents Section | **In Scope** | Proposal includes "OCR Engine" with confidence scoring. Displaying OCR status/confidence and staff verification in the admin view is a natural extension. |
| 5 | Timeline / Notes / Comms / Tasks | **New Scope** | Proposal includes audit logs and basic admin notes. Structured communication logs, task management with reminders, and separated timeline are new. |
| 6 | Receipt Matching Queue | **New Scope** | Proposal scopes OCR for user-uploaded documents. Incoming receipt matching with confidence scoring and auto-linking is new. |
| 7 | Billing Module (deposit + fee calc) | **Partially In Scope** | Proposal includes "Payment Processing" and "Unified Invoice Module." The deposit → refund → fee calculation → payment link → credit note lifecycle is new. Billing model has changed from €89/year to €199 deposit + 9.75%. |
| 8 | Post-Refund Automation | **New Scope** | Automated flow from receipt upload → OCR → claim match → fee calc → Stripe link → email → invoice is not in the proposal. |
| 9 | Case Classification | **New Scope** | Classifying cases as standard/manual review/provider clarification/authority follow-up is not mentioned in the proposal. |
| 10 | Submission Tracking & Aging | **New Scope** | Tracking days since submission, last contact date, follow-up dates, and aging filters are not in the proposal. |
| 11 | Communication Log | **New Scope** | Structured call logging (who called, outcome, next follow-up) is not in the proposal. The proposal has basic audit logs only. |
| 12 | Smart Task Cancellation | **New Scope** | Auto-cancelling follow-up tasks when a claim is resolved/rejected is not in the proposal. |
| 13 | Assignment & Workload | **New Scope** | Staff assignment, unassigned claim views, SLA tracking, and waiting reasons are not in the proposal. |
| 14 | Data Formatting | **In Scope** | Displaying dates, country codes, and labels in human-friendly format is part of basic admin quality. |
| 15 | Permissions & Audit | **In Scope** | Proposal explicitly mentions role-based access (admin, law firm, support), field-level ACLs, MFA for admin/law firm users, and audit logging. |

### Scope Summary

| Category | Count | Items |
|----------|-------|-------|
| **In Scope** | 3 | #4 (Documents), #14 (Data Formatting), #15 (Permissions & Audit) |
| **Partially In Scope** | 4 | #1 (Search), #2 (Status Workflow), #3 (Claim Header), #7 (Billing) |
| **New Scope** | 8 | #5 (Timeline/Notes/Comms/Tasks), #6 (Receipt Matching), #8 (Post-Refund Automation), #9 (Case Classification), #10 (Submission Tracking), #11 (Communication Log), #12 (Smart Task Cancellation), #13 (Assignment & Workload) |

---

## 4. Priority Features (per Johannes)

### P1: Search & Filters

**Scope Status: Partially In Scope**

#### Requirements

- **Full-text search** across: applicant name, email, claim ID, SV number (insurance/social security), passport number
- **Filters**: claim status, payment status, assigned staff member, submission date range, updated date range, product type, claim type/sector, document status, OCR/manual review status
- **Sorting**: by any filterable column
- **Saved views** (predefined): "New submissions," "Awaiting review," "Follow-up due," "Receipt matching queue"

#### DB Changes

```sql
-- Add search index for full-text search across claims
CREATE INDEX idx_claims_search ON claims.claims
  USING GIN (to_tsvector('english',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(sv_nummer, '') || ' ' ||
    coalesce(passport_number, '')
  ));

-- Add index for common filter columns
CREATE INDEX idx_claims_status ON claims.claims (status);
CREATE INDEX idx_claims_payment_status ON claims.claims (payment_status);
CREATE INDEX idx_claims_submitted_at ON claims.claims (submitted_at);
CREATE INDEX idx_claims_updated_at ON claims.claims (updated_at);

-- Product type column (new)
ALTER TABLE claims.claims ADD COLUMN product VARCHAR(20) DEFAULT 'company_pension';

-- Assigned staff (new — see P3)
ALTER TABLE claims.claims ADD COLUMN assigned_to UUID REFERENCES shared.users(id);
```

#### API Changes

Extend `GET /api/admin/claims`:

```
GET /api/admin/claims?
  q=search+term&           # full-text search
  status=processing&       # claim status filter
  paymentStatus=paid&      # payment status filter
  assignedTo=uuid&         # staff assignment filter
  product=company_pension& # product type filter
  claimType=own_refund&    # claim subtype filter
  submittedAfter=2026-01-01&
  submittedBefore=2026-03-01&
  sortBy=submittedAt&      # sort field
  sortOrder=asc&           # asc | desc
  page=1&limit=20
```

Add saved views endpoint:

```
GET /api/admin/claims/views          # list saved views
POST /api/admin/claims/views         # create saved view
DELETE /api/admin/claims/views/:id   # delete saved view
```

#### Frontend Changes

- Replace status tab bar with a filter panel (dropdown filters + search input)
- Add sort controls to table headers
- Add saved view selector/dropdown
- Debounced search input with 300ms delay

---

### P2: Internal Status Workflow

**Scope Status: Partially In Scope**

#### Requirements

Replace the current 6-status system with a 15-status internal workflow. Public-facing statuses stay simple.

**Internal statuses:**

| # | Internal Status | Public-Facing Status | Allowed Transitions From |
|---|----------------|---------------------|--------------------------|
| 1 | `draft` | Draft | — (entry state) |
| 2 | `submitted` | Submitted | `draft` |
| 3 | `deposit_paid` | Submitted | `submitted` |
| 4 | `under_review` | In Progress | `deposit_paid` |
| 5 | `waiting_for_user` | Action Required | `under_review` |
| 6 | `ready_for_submission` | In Progress | `under_review`, `waiting_for_user` |
| 7 | `submitted_to_authority` | Submitted to Authority | `ready_for_submission` |
| 8 | `awaiting_authority_response` | Processing | `submitted_to_authority` |
| 9 | `refund_receipt_received` | Processing | `awaiting_authority_response` |
| 10 | `fee_calculation_pending` | Processing | `refund_receipt_received` |
| 11 | `payment_link_sent` | Payment Due | `fee_calculation_pending` |
| 12 | `final_fee_paid` | Completed | `payment_link_sent` |
| 13 | `completed` | Completed | `final_fee_paid`, `fee_calculation_pending` (no balance due) |
| 14 | `rejected` | Rejected | `under_review`, `awaiting_authority_response` |
| 15 | `cancelled` | Cancelled | any except `completed` |

#### DB Changes

```sql
-- Update the status column to support new values
-- (no schema change needed — varchar(50) already supports these)

-- Add internal_status column (keep 'status' as the public-facing status for backward compatibility)
ALTER TABLE claims.claims ADD COLUMN internal_status VARCHAR(50) DEFAULT 'draft';

-- Add public status mapping function or handle in application code
```

#### API Changes

- Update `PUT /api/admin/claims/:id/status` to accept internal statuses and validate transitions
- Add `GET /api/admin/claims/status-config` returning the status workflow graph (so the frontend can render valid transitions dynamically)

#### Frontend Changes

- Update status badges with colors for all 15 statuses
- Show internal status (for staff) and public status (for reference) side by side
- Transition buttons show only valid next statuses
- Add a visual workflow stepper/timeline in the claim detail

---

### P3: Assignment, Claim Aging & Follow-ups

**Scope Status: New Scope**

#### Requirements

- Assign a claim to a staff member
- View unassigned claims
- Track: days since submission, last authority/provider contact date, next follow-up date, follow-up status
- Filter by: oldest submitted, follow-up due, follow-up overdue, no update in X days
- Record a "waiting reason" per claim

#### DB Changes

```sql
-- Staff assignment
ALTER TABLE claims.claims ADD COLUMN assigned_to UUID REFERENCES shared.users(id);
ALTER TABLE claims.claims ADD COLUMN assigned_at TIMESTAMPTZ;

-- Follow-up tracking
ALTER TABLE claims.claims ADD COLUMN next_follow_up_date DATE;
ALTER TABLE claims.claims ADD COLUMN follow_up_status VARCHAR(50); -- 'pending', 'overdue', 'completed', 'cancelled'
ALTER TABLE claims.claims ADD COLUMN last_contact_date TIMESTAMPTZ;
ALTER TABLE claims.claims ADD COLUMN waiting_reason TEXT;

-- Case classification (from point #9)
ALTER TABLE claims.claims ADD COLUMN case_classification VARCHAR(50) DEFAULT 'standard';
  -- 'standard', 'manual_review', 'provider_clarification', 'authority_follow_up'

-- Priority / tags
ALTER TABLE claims.claims ADD COLUMN priority VARCHAR(20) DEFAULT 'normal'; -- 'low', 'normal', 'high', 'urgent'
ALTER TABLE claims.claims ADD COLUMN tags JSONB DEFAULT '[]';

-- Indexes
CREATE INDEX idx_claims_assigned_to ON claims.claims (assigned_to);
CREATE INDEX idx_claims_next_follow_up ON claims.claims (next_follow_up_date);
CREATE INDEX idx_claims_case_classification ON claims.claims (case_classification);
```

#### API Changes

```
PUT  /api/admin/claims/:id/assign     { staffId: uuid }
PUT  /api/admin/claims/:id/follow-up  { nextDate, reason? }
PUT  /api/admin/claims/:id/classify   { classification }
GET  /api/admin/staff                  # list staff members for assignment dropdown
GET  /api/admin/claims?assignedTo=unassigned&sortBy=submittedAt&sortOrder=asc
GET  /api/admin/claims?followUpOverdue=true
```

#### Frontend Changes

- Staff assignment dropdown in claim detail header
- "Unassigned claims" saved view
- Follow-up date picker + waiting reason input
- Aging indicators: days since submission, time since last contact
- Color-coded priority badges
- Case classification selector

---

### P4: Timeline / Notes / Communication Log / Tasks

**Scope Status: New Scope**

#### Requirements

Split the current "Notes & Workflow" section into 4 distinct areas:

| Section | Content | Entries |
|---------|---------|--------|
| **Timeline** | Automatic system events | Status changes, document uploads, payments, auto-generated entries |
| **Internal Notes** | Free-text staff notes | Manual entries by staff, visible to staff only |
| **Communication Log** | Contact records | Date, who was called, caller, outcome, notes, next follow-up |
| **Tasks** | Follow-ups & reminders | Due date, assignee, linked claim, auto-cancel on resolution |

**Communication log outcomes** (predefined):
- `no_answer`
- `claim_in_process`
- `additional_documents_requested`
- `refund_approved`
- `rejection_expected`
- `callback_requested`
- `other`

#### DB Changes

```sql
-- New table: admin_notes (separated from workflow states)
CREATE TABLE claims.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims.claims(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES shared.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- New table: communication_log
CREATE TABLE claims.communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims.claims(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES shared.users(id),
  contact_date TIMESTAMPTZ NOT NULL,
  contact_type VARCHAR(50) NOT NULL, -- 'phone_call', 'email', 'letter', 'portal_message'
  contacted_party VARCHAR(100) NOT NULL, -- e.g., 'VBL', 'DRV', 'User', provider name
  caller_name VARCHAR(100), -- staff member who made the call
  outcome VARCHAR(50) NOT NULL, -- predefined outcomes
  notes TEXT,
  next_follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- New table: tasks
CREATE TABLE claims.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims.claims(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES shared.users(id),
  created_by UUID NOT NULL REFERENCES shared.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  auto_cancel_on_resolution BOOLEAN DEFAULT true,
  cancelled_reason VARCHAR(255), -- e.g., 'claim_completed', 'claim_rejected'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_claim_id ON claims.tasks (claim_id);
CREATE INDEX idx_tasks_assigned_to ON claims.tasks (assigned_to);
CREATE INDEX idx_tasks_due_date ON claims.tasks (due_date);
CREATE INDEX idx_tasks_status ON claims.tasks (status);
```

#### API Changes

```
-- Notes
POST   /api/admin/claims/:id/notes         { content }
GET    /api/admin/claims/:id/notes

-- Communication Log
POST   /api/admin/claims/:id/communications { contactDate, contactType, contactedParty, callerName, outcome, notes, nextFollowUpDate? }
GET    /api/admin/claims/:id/communications

-- Tasks
POST   /api/admin/tasks                     { claimId?, assignedTo?, title, description?, dueDate?, autoCancel? }
GET    /api/admin/tasks?assignedTo=me&status=pending&dueBefore=2026-03-15
PUT    /api/admin/tasks/:id                 { status?, dueDate?, assignedTo? }
DELETE /api/admin/tasks/:id

-- Timeline (read-only, auto-generated)
GET    /api/admin/claims/:id/timeline
```

**Smart task cancellation (point #12):** When a claim transitions to `completed`, `rejected`, or `cancelled`, auto-cancel all pending tasks where `auto_cancel_on_resolution = true` and record the cancellation reason.

#### Frontend Changes

- Replace the single "Notes & Workflow" section with 4 tabbed panels
- Timeline: chronological list of system events (read-only)
- Notes: text input + list of staff notes
- Communications: structured form (date picker, dropdown for type/outcome, text fields) + chronological list
- Tasks: task creation form, task list with due date sorting, status toggles
- Global task dashboard view (across all claims) for staff to see their upcoming tasks

---

### P5: Billing Module

**Scope Status: Partially In Scope**

#### Requirements

Track the full billing lifecycle per claim:

| Field | Description |
|-------|-------------|
| Deposit amount | €199 (configurable per product) |
| Deposit payment date | When deposit was paid |
| Deposit invoice | Reference to generated invoice |
| Deposit Stripe payment ID | Stripe checkout/payment intent ID |
| Refund amount | Amount received from authority |
| Final service fee | 9.75% of refund amount |
| Deposit credit | Amount of deposit applied to fee |
| Outstanding balance | `max(0, service_fee - deposit)` |
| Payment link | Stripe payment link for outstanding balance |
| Payment link status | `pending`, `paid`, `expired` |
| Payment link sent at | When the link was emailed |
| Final invoice | Reference to final invoice |
| Deposit refund status | For rejected claims: `pending`, `refunded` |
| Credit note | For cases where deposit > fee |

#### DB Changes

```sql
-- New table: claim_billing
CREATE TABLE claims.claim_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL UNIQUE REFERENCES claims.claims(id) ON DELETE CASCADE,

  -- Deposit
  deposit_amount DECIMAL(10,2) DEFAULT 199.00,
  deposit_paid_at TIMESTAMPTZ,
  deposit_stripe_payment_id VARCHAR(255),
  deposit_invoice_number VARCHAR(50),

  -- Refund from authority
  refund_amount DECIMAL(10,2),
  refund_received_at TIMESTAMPTZ,
  refund_reference VARCHAR(255), -- authority reference number

  -- Fee calculation
  fee_percentage DECIMAL(5,4) DEFAULT 0.0975, -- 9.75%
  service_fee DECIMAL(10,2), -- calculated: refund_amount * fee_percentage
  deposit_credit DECIMAL(10,2), -- min(deposit_amount, service_fee)
  outstanding_balance DECIMAL(10,2), -- max(0, service_fee - deposit_amount)

  -- Outstanding balance collection
  payment_link_url VARCHAR(500),
  payment_link_stripe_id VARCHAR(255),
  payment_link_status VARCHAR(50), -- 'pending', 'paid', 'expired'
  payment_link_sent_at TIMESTAMPTZ,
  final_payment_stripe_id VARCHAR(255),
  final_paid_at TIMESTAMPTZ,

  -- Invoices
  final_invoice_number VARCHAR(50),
  credit_note_number VARCHAR(50), -- if deposit > fee

  -- Rejection / refund of deposit
  deposit_refund_status VARCHAR(50), -- 'not_applicable', 'pending', 'refunded'
  deposit_refund_stripe_id VARCHAR(255),
  deposit_refunded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claim_billing_claim_id ON claims.claim_billing (claim_id);
CREATE INDEX idx_claim_billing_payment_link_status ON claims.claim_billing (payment_link_status);
```

#### API Changes

```
GET    /api/admin/claims/:id/billing                # get billing details
PUT    /api/admin/claims/:id/billing/refund          { refundAmount, refundReference, refundReceivedAt }
POST   /api/admin/claims/:id/billing/calculate-fee   # trigger fee calculation
POST   /api/admin/claims/:id/billing/payment-link    # create Stripe payment link
POST   /api/admin/claims/:id/billing/refund-deposit  # trigger deposit refund (rejected claims)
```

#### Frontend Changes

- Dedicated "Billing" tab in claim detail (replaces the current basic Payment section)
- Visual billing flow: Deposit → Refund Received → Fee Calculated → Payment Link → Settled
- Status indicators for each billing step
- Action buttons: "Record Refund," "Calculate Fee," "Send Payment Link," "Refund Deposit"
- Stripe dashboard links for all payment IDs

---

### P6: Receipt Matching Queue

**Scope Status: New Scope**

#### Requirements

Dedicated workflow for incoming refund receipts or authority statements:

1. Staff uploads a scanned receipt
2. System OCRs it and extracts: applicant name, insurance number, claim reference, refund amount, refund date
3. System suggests the most likely matching claim with a confidence score
4. High-confidence matches (≥90%) can be auto-linked
5. Lower-confidence matches go into a manual matching queue
6. Linked receipts trigger the billing workflow (fee calculation → payment link → email)

#### DB Changes

```sql
-- New table: incoming_receipts
CREATE TABLE claims.incoming_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES shared.users(id),
  document_id UUID NOT NULL REFERENCES shared.documents(id),

  -- OCR extracted data
  ocr_applicant_name VARCHAR(255),
  ocr_insurance_number VARCHAR(100),
  ocr_claim_reference VARCHAR(255),
  ocr_refund_amount DECIMAL(10,2),
  ocr_refund_date DATE,
  ocr_raw_data JSONB,
  ocr_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

  -- Matching
  matched_claim_id UUID REFERENCES claims.claims(id),
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  match_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'auto_matched', 'manually_matched', 'unmatched'
  matched_by UUID REFERENCES shared.users(id),
  matched_at TIMESTAMPTZ,

  -- Candidate matches for manual review
  candidate_matches JSONB DEFAULT '[]', -- [{claimId, confidence, matchedFields}]

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_incoming_receipts_match_status ON claims.incoming_receipts (match_status);
CREATE INDEX idx_incoming_receipts_ocr_status ON claims.incoming_receipts (ocr_status);
```

#### API Changes

```
POST   /api/admin/receipts/upload               # upload receipt + trigger OCR
GET    /api/admin/receipts                       # list receipts (filter by match_status)
GET    /api/admin/receipts/:id                   # receipt detail with candidate matches
PUT    /api/admin/receipts/:id/match             { claimId }  # manually match to claim
POST   /api/admin/receipts/:id/trigger-billing   # trigger billing workflow after match
```

#### Frontend Changes

- New top-level "Receipt Queue" page in admin navigation
- Upload interface for receipts
- Queue view: unmatched receipts sorted by upload date
- Match review interface: OCR extracted data side-by-side with candidate claims
- One-click match confirmation
- Status indicators: Pending OCR → Matched → Billing Triggered

---

## 5. Additional Requirements (Non-Prioritized)

### 5.1 Data Formatting (Point #14)

**Scope Status: In Scope**

Current issues:
- Raw timestamps displayed (e.g., `1972-11-27T00:00:00.000Z`)
- Country codes shown as ISO alpha-2 (e.g., `CH` instead of `Switzerland`)
- Internal labels shown raw (e.g., `own_refund` instead of `Own Refund Claim`)

Fix:
- Add formatting utility functions in `apps/admin/lib/format.ts`
- Date formatter: `formatDate(date)` → `27 Nov 1972`
- Country formatter: `formatCountry(code)` → `Switzerland` (use `Intl.DisplayNames`)
- Label formatter: `formatLabel(key)` → humanized version
- Apply across all existing components

### 5.2 Enriched Claim Header (Point #3)

**Scope Status: Partially In Scope**

Add to claim detail header:
- Claim ID with copy-to-clipboard button
- Product type badge
- Claim subtype/scheme
- Provider name
- Assigned staff member
- Created date, submitted date, last updated date
- Internal tags / priority flags

New: Store the eligibility/calculator snapshot that led the user into the claims flow:

```sql
ALTER TABLE claims.claims ADD COLUMN eligibility_snapshot JSONB;
-- Contains: { ruleVersion, contributionYears, contributionMonths,
--             eligibilityOutcome, estimatedRefund, estimatedFee, calculatorInputs }

ALTER TABLE claims.claims ADD COLUMN terms_accepted_at TIMESTAMPTZ;
```

### 5.3 Enhanced Documents Section (Point #4)

**Scope Status: In Scope**

Current: shows file name, document role, file type, and a download button.

Add:
- Document type label (human-readable)
- Upload date
- OCR status badge (`pending`, `processing`, `completed`, `failed`)
- OCR confidence score (percentage)
- Staff verification status (`unverified`, `verified`, `rejected`)
- Replace/add document actions

Requires new column:

```sql
ALTER TABLE claims.claim_documents ADD COLUMN verified_by UUID REFERENCES shared.users(id);
ALTER TABLE claims.claim_documents ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE claims.claim_documents ADD COLUMN verification_status VARCHAR(50) DEFAULT 'unverified';
```

### 5.4 Post-Refund Automation (Point #8)

**Scope Status: New Scope**

Ideal automated flow triggered after a receipt is matched to a claim:

```
Receipt matched to claim
  → Extract refund amount from OCR
  → Update claim_billing.refund_amount
  → Calculate service fee (refund × 9.75%)
  → Calculate deposit credit and outstanding balance
  → IF outstanding balance > 0:
      → Create Stripe payment link
      → Attach refund statement document
      → Send payment email to user
      → Generate final invoice
  → IF outstanding balance ≤ 0:
      → Mark as fee-settled
      → Generate credit note (if deposit > fee)
  → IF claim was rejected:
      → Trigger deposit refund via Stripe
      → Generate credit note
  → Update claim internal_status accordingly
```

Implementation: Service function `BillingService.processPostRefund(claimId)` orchestrating Stripe API calls, invoice generation, and email sending.

### 5.5 Permissions & Audit (Point #15)

**Scope Status: In Scope**

Proposed roles:

| Role | Access Level |
|------|-------------|
| `admin` | Full access to all features and data |
| `ops_manager` | All claims, assignment, reporting, billing |
| `caseworker` | Assigned claims, notes, communications, documents |
| `finance` | Billing, invoices, payment tracking, reports |
| `readonly` | View-only access to claims and documents |

Implementation:
- Extend `shared.users.role` to support new roles (currently only `'user'` | `'admin'`)
- Update `adminMiddleware` to accept an array of allowed roles per route
- Add field-level ACLs per proposal (passport numbers, IBANs redacted for unauthorized roles)
- Ensure all write actions create `audit_logs` entries

---

## 6. Schema Migration Checklist

Summary of all DB changes across all features. Apply as a single Drizzle migration or split into feature-based migrations.

### New Columns on `claims.claims`

| Column | Type | Default | Feature |
|--------|------|---------|---------|
| `product` | `VARCHAR(20)` | `'company_pension'` | P1 Search |
| `internal_status` | `VARCHAR(50)` | `'draft'` | P2 Status |
| `assigned_to` | `UUID` (FK → users) | `NULL` | P3 Assignment |
| `assigned_at` | `TIMESTAMPTZ` | `NULL` | P3 Assignment |
| `next_follow_up_date` | `DATE` | `NULL` | P3 Follow-ups |
| `follow_up_status` | `VARCHAR(50)` | `NULL` | P3 Follow-ups |
| `last_contact_date` | `TIMESTAMPTZ` | `NULL` | P3 Follow-ups |
| `waiting_reason` | `TEXT` | `NULL` | P3 Follow-ups |
| `case_classification` | `VARCHAR(50)` | `'standard'` | P3 / #9 |
| `priority` | `VARCHAR(20)` | `'normal'` | P3 |
| `tags` | `JSONB` | `'[]'` | P3 |
| `eligibility_snapshot` | `JSONB` | `NULL` | #3 Header |
| `terms_accepted_at` | `TIMESTAMPTZ` | `NULL` | #3 Header |

### New Columns on `claims.claim_documents`

| Column | Type | Default | Feature |
|--------|------|---------|---------|
| `verified_by` | `UUID` (FK → users) | `NULL` | #4 Documents |
| `verified_at` | `TIMESTAMPTZ` | `NULL` | #4 Documents |
| `verification_status` | `VARCHAR(50)` | `'unverified'` | #4 Documents |

### New Tables

| Table | Feature |
|-------|---------|
| `claims.admin_notes` | P4 Notes |
| `claims.communication_log` | P4 / #11 Communications |
| `claims.tasks` | P4 / #12 Tasks |
| `claims.claim_billing` | P5 Billing |
| `claims.incoming_receipts` | P6 Receipt Queue |

### New Indexes

| Index | Table | Columns |
|-------|-------|---------|
| `idx_claims_search` | `claims.claims` | GIN full-text (name, SV, passport) |
| `idx_claims_status` | `claims.claims` | `status` |
| `idx_claims_payment_status` | `claims.claims` | `payment_status` |
| `idx_claims_submitted_at` | `claims.claims` | `submitted_at` |
| `idx_claims_assigned_to` | `claims.claims` | `assigned_to` |
| `idx_claims_next_follow_up` | `claims.claims` | `next_follow_up_date` |
| `idx_claims_case_classification` | `claims.claims` | `case_classification` |
| `idx_tasks_*` | `claims.tasks` | claim_id, assigned_to, due_date, status |
| `idx_incoming_receipts_*` | `claims.incoming_receipts` | match_status, ocr_status |
| `idx_claim_billing_*` | `claims.claim_billing` | claim_id, payment_link_status |

---

## 7. Frontend Component Plan

### New Pages

| Path | Component | Description |
|------|-----------|-------------|
| `/claims` | `ClaimsListPage` | Enhanced with search bar, filter panel, saved views, sortable columns |
| `/claims/[id]` | `ClaimDetailPage` | Enriched header + tabbed sections |
| `/receipts` | `ReceiptQueuePage` | Upload interface + matching queue |
| `/tasks` | `TaskDashboardPage` | Global task view across all claims |

### New Components (Claim Detail Tabs)

| Tab | Component | Content |
|-----|-----------|---------|
| Overview | `ClaimOverview` | Personal info, addresses, bank details (existing, reformatted) |
| Timeline | `ClaimTimeline` | Auto-generated system events (read-only) |
| Notes | `ClaimNotes` | Staff internal notes |
| Communications | `ClaimCommunications` | Structured call/email log |
| Documents | `ClaimDocuments` | Enhanced with OCR status, verification, replace/add |
| Billing | `ClaimBilling` | Full billing lifecycle view |
| Tasks | `ClaimTasks` | Tasks linked to this claim |

### Shared Components

| Component | Description |
|-----------|-------------|
| `SearchBar` | Debounced full-text search input |
| `FilterPanel` | Multi-select dropdowns for all filter dimensions |
| `StatusBadge` | Updated for 15 internal statuses + color mapping |
| `PriorityBadge` | Low / Normal / High / Urgent badges |
| `StaffSelector` | Dropdown for assigning staff members |
| `DateDisplay` | Formatted date display (replaces raw timestamps) |
| `CountryDisplay` | Country code → full name |
| `CopyButton` | Click-to-copy (for claim ID, etc.) |
| `AgingIndicator` | Days since submission / last contact |

### Navigation Updates

Current: direct `/claims` route only.

Add sidebar navigation:
- Dashboard (stats overview)
- Claims (list with filters)
- Receipt Queue
- Tasks
- (Future: Reports, Settings)
