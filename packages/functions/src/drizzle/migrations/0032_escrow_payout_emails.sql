-- GPR and bAV escrow payouts (owner spec "Implementation specification and
-- email templates", v1.0, 30 Oct 2026). Idempotent.
--
-- 1. payout_decisions: who actually received the decision and when, the
--    date ATLAES received it (the 10-day timers run from here), admin
--    verification of the review due date, publication (a client upload
--    stays unpublished until admin verifies it). Existing decisions were
--    shown at once, so they are backfilled as published.
-- 2. payout_releases: the first payout invitation (reminders and the
--    30-day follow-up run from here), the TransferMate onward transfer
--    (final amount and currency, date, receipt), the expected arrival at
--    the client's bank and the client's receipt confirmation.
-- 3. claims: payout hold, contact pause with next-contact date, and the
--    client's "decision sent directly to me / not received" answer.
-- 4. payout_email_log: one row per milestone and business event
--    (unique event_key), so a milestone is never sent twice.
-- 5. payout_tasks: admin follow-ups the timers open (missing funds,
--    missing decision, overdue review, transfer record incomplete, …).
ALTER TABLE "claims"."payout_decisions" ADD COLUMN IF NOT EXISTS "recipient" varchar(20);
--> statement-breakpoint
ALTER TABLE "claims"."payout_decisions" ADD COLUMN IF NOT EXISTS "atlaes_received_at" date;
--> statement-breakpoint
ALTER TABLE "claims"."payout_decisions" ADD COLUMN IF NOT EXISTS "review_due_verified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."payout_decisions" ADD COLUMN IF NOT EXISTS "source" varchar(20) DEFAULT 'admin' NOT NULL;
--> statement-breakpoint
ALTER TABLE "claims"."payout_decisions" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."payout_decisions" ADD COLUMN IF NOT EXISTS "published_by" uuid;
--> statement-breakpoint
UPDATE "claims"."payout_decisions" SET "published_at" = COALESCE("created_at", now()) WHERE "published_at" IS NULL AND "source" = 'admin';
--> statement-breakpoint
UPDATE "claims"."payout_decisions" SET "atlaes_received_at" = "received_at" WHERE "atlaes_received_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "invited_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "onward_amount" numeric(14, 2);
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "onward_currency" varchar(3);
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "onward_transfer_date" date;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "onward_receipt_document_id" uuid;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "onward_recorded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "onward_recorded_by" uuid;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "expected_arrival_date" date;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "receipt_status" varchar(20);
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "receipt_status_at" timestamp with time zone;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_releases" ADD CONSTRAINT "payout_releases_onward_receipt_document_id_documents_id_fk" FOREIGN KEY ("onward_receipt_document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_hold_reason" text;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_hold_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_hold_by" uuid;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "contact_pause_reason" text;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "contact_paused_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "next_contact_date" date;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "decision_direct_to_client_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "decision_not_received_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."payout_email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"release_id" uuid,
	"template" varchar(10) NOT NULL,
	"event_key" varchar(200) NOT NULL,
	"template_version" varchar(20) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"bcc" varchar(255),
	"status" varchar(20) DEFAULT 'sending' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_email_log" ADD CONSTRAINT "payout_email_log_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payout_email_log_event_key_uq" ON "claims"."payout_email_log" USING btree ("event_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_email_log_claim_idx" ON "claims"."payout_email_log" USING btree ("claim_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."payout_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"release_id" uuid,
	"kind" varchar(40) NOT NULL,
	"dedupe_key" varchar(200) NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"detail" text,
	"status" varchar(10) DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_tasks" ADD CONSTRAINT "payout_tasks_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payout_tasks_dedupe_key_uq" ON "claims"."payout_tasks" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_tasks_status_idx" ON "claims"."payout_tasks" USING btree ("status");
