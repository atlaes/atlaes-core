-- Client review-and-release payout flow (platform brief 2026-09-16,
-- Part 2 §2–§4). Per-claim queue columns on claims.claims (read by the
-- law-firm payout queue), the Bescheid decision record, the client's
-- missing-period report, and one release row per funds event (E1).
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_release_id" uuid;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_ze_document_id" uuid;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_ze_s3_key" varchar(500);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_small_refund" boolean;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_details_review_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_amount_mismatch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_payout_released_at_idx" ON "claims"."claims" ("payout_released_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."payout_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"document_id" uuid,
	"received_at" date NOT NULL,
	"decision_date" date,
	"office" varchar(255),
	"refund_amount_eur" numeric(12, 2),
	"periods" jsonb DEFAULT '[]'::jsonb,
	"objection_deadline" date NOT NULL,
	"client_review_by" date NOT NULL,
	"extraction" jsonb,
	"extraction_error" text,
	"corrected_by" uuid,
	"corrected_at" timestamp with time zone,
	"review_outcome" varchar(20),
	"reviewed_at" timestamp with time zone,
	"notified_kind" varchar(10),
	"notified_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."payout_customer_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"decision_id" uuid,
	"kind" varchar(30) DEFAULT 'missing_periods' NOT NULL,
	"description" text NOT NULL,
	"document_ids" jsonb DEFAULT '[]'::jsonb,
	"objection_deadline" date,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."payout_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"amount_received_eur" numeric(12, 2) NOT NULL,
	"value_date" date NOT NULL,
	"statement_reference" text,
	"funds_recorded_at" timestamp with time zone DEFAULT now(),
	"fee_eur" numeric(12, 2) NOT NULL,
	"fee_capped" boolean DEFAULT false NOT NULL,
	"small_refund" boolean DEFAULT false NOT NULL,
	"law_firm_fee_eur" numeric(12, 2) NOT NULL,
	"atlaes_share_eur" numeric(12, 2) NOT NULL,
	"client_amount_eur" numeric(12, 2) NOT NULL,
	"invoice_number" varchar(50),
	"account" jsonb,
	"account_confirmed_at" timestamp with time zone,
	"route" varchar(1),
	"route_choice" jsonb,
	"review_required" boolean DEFAULT false NOT NULL,
	"review_reasons" jsonb DEFAULT '[]'::jsonb,
	"review_cleared_at" timestamp with time zone,
	"review_cleared_by" uuid,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"ze_document_number" varchar(40),
	"ze_document_id" uuid,
	"ze_s3_key" varchar(500),
	"ze_sha256" varchar(64),
	"signed_at" timestamp with time zone,
	"signer_ip" varchar(64),
	"audit_record" jsonb,
	"notified_kind" varchar(10),
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_payout_ze_document_id_documents_id_fk" FOREIGN KEY ("payout_ze_document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_decisions" ADD CONSTRAINT "payout_decisions_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_decisions" ADD CONSTRAINT "payout_decisions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_decisions" ADD CONSTRAINT "payout_decisions_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_decisions" ADD CONSTRAINT "payout_decisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_customer_inputs" ADD CONSTRAINT "payout_customer_inputs_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_customer_inputs" ADD CONSTRAINT "payout_customer_inputs_decision_id_payout_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "claims"."payout_decisions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_customer_inputs" ADD CONSTRAINT "payout_customer_inputs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_customer_inputs" ADD CONSTRAINT "payout_customer_inputs_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_releases" ADD CONSTRAINT "payout_releases_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_releases" ADD CONSTRAINT "payout_releases_review_cleared_by_users_id_fk" FOREIGN KEY ("review_cleared_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_releases" ADD CONSTRAINT "payout_releases_ze_document_id_documents_id_fk" FOREIGN KEY ("ze_document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_decisions_claim_id_idx" ON "claims"."payout_decisions" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_customer_inputs_claim_id_idx" ON "claims"."payout_customer_inputs" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_releases_claim_id_idx" ON "claims"."payout_releases" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_releases_status_idx" ON "claims"."payout_releases" ("status");
