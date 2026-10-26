-- Incoming funds (E1), fee invoices and the law-firm payout queue
-- (platform brief 16 Sep 2026, Part 2 §1, §5, §6). Idempotent.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "invoice_number" varchar(50);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "paid_out_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."statement_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_firm_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"file_name" varchar(255) NOT NULL,
	"file_kind" varchar(10) NOT NULL,
	"s3_key" varchar(500),
	"column_map" jsonb NOT NULL,
	"line_count" integer DEFAULT 0 NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"unmatched_count" integer DEFAULT 0 NOT NULL,
	"matched_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."statement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"law_firm_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"value_date" date,
	"amount" numeric(12, 2),
	"reference" text,
	"payer" varchar(255),
	"raw" jsonb,
	"status" varchar(20) NOT NULL,
	"match_reason" varchar(20),
	"claim_id" uuid,
	"suggested_claim_ids" jsonb,
	"firm_suggestion" text,
	"firm_suggested_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"dedupe_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."funds_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"statement_line_id" uuid,
	"amount_received" numeric(12, 2) NOT NULL,
	"value_date" date NOT NULL,
	"fee" numeric(12, 2) NOT NULL,
	"fee_capped" boolean DEFAULT false NOT NULL,
	"small_refund" boolean DEFAULT false NOT NULL,
	"law_firm_fee" numeric(12, 2) NOT NULL,
	"atlaes_share" numeric(12, 2) NOT NULL,
	"client_amount" numeric(12, 2) NOT NULL,
	"fee_config" jsonb NOT NULL,
	"decision_amount" numeric(12, 2),
	"amount_mismatch" boolean DEFAULT false NOT NULL,
	"notification_kind" varchar(4),
	"notified_at" timestamp with time zone,
	"payout_release_id" uuid,
	"released_at" timestamp with time zone,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"funds_receipt_id" uuid,
	"kind" varchar(20) DEFAULT 'invoice' NOT NULL,
	"cancels_invoice_id" uuid,
	"provider" varchar(20) NOT NULL,
	"provider_id" varchar(100),
	"invoice_number" varchar(50),
	"status" varchar(20) NOT NULL,
	"gross_amount" numeric(12, 2) NOT NULL,
	"tax_rate_percent" numeric(5, 2) NOT NULL,
	"voucher_date" date NOT NULL,
	"pdf_s3_key" varchar(500),
	"last_error" text,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"paid_on" date,
	"provider_paid_synced_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."payout_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"payout_release_id" uuid NOT NULL,
	"funds_receipt_id" uuid,
	"law_firm_id" uuid,
	"kind" varchar(10) NOT NULL,
	"route" varchar(1),
	"recipient" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"account" varchar(100) NOT NULL,
	"bic" varchar(20),
	"bank" varchar(255),
	"transfer_method" varchar(10) NOT NULL,
	"reference" varchar(140) NOT NULL,
	"currency" varchar(3),
	"remarks" text,
	"status" varchar(10) DEFAULT 'open' NOT NULL,
	"paid_on" date,
	"paid_by" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."statement_imports" ADD CONSTRAINT "statement_imports_law_firm_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."statement_imports" ADD CONSTRAINT "statement_imports_uploaded_by_fk" FOREIGN KEY ("uploaded_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."statement_lines" ADD CONSTRAINT "statement_lines_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "claims"."statement_imports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."statement_lines" ADD CONSTRAINT "statement_lines_law_firm_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."statement_lines" ADD CONSTRAINT "statement_lines_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."statement_lines" ADD CONSTRAINT "statement_lines_resolved_by_fk" FOREIGN KEY ("resolved_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."funds_receipts" ADD CONSTRAINT "funds_receipts_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."funds_receipts" ADD CONSTRAINT "funds_receipts_statement_line_id_fk" FOREIGN KEY ("statement_line_id") REFERENCES "claims"."statement_lines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."funds_receipts" ADD CONSTRAINT "funds_receipts_recorded_by_fk" FOREIGN KEY ("recorded_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."invoices" ADD CONSTRAINT "invoices_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."invoices" ADD CONSTRAINT "invoices_funds_receipt_id_fk" FOREIGN KEY ("funds_receipt_id") REFERENCES "claims"."funds_receipts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_lines" ADD CONSTRAINT "payout_lines_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_lines" ADD CONSTRAINT "payout_lines_payout_release_id_fk" FOREIGN KEY ("payout_release_id") REFERENCES "claims"."payout_releases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_lines" ADD CONSTRAINT "payout_lines_funds_receipt_id_fk" FOREIGN KEY ("funds_receipt_id") REFERENCES "claims"."funds_receipts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_lines" ADD CONSTRAINT "payout_lines_law_firm_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."payout_lines" ADD CONSTRAINT "payout_lines_paid_by_fk" FOREIGN KEY ("paid_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "statement_imports_firm_idx" ON "claims"."statement_imports" ("law_firm_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "statement_lines_import_idx" ON "claims"."statement_lines" ("import_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "statement_lines_status_idx" ON "claims"."statement_lines" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "statement_lines_dedupe_idx" ON "claims"."statement_lines" ("law_firm_id", "dedupe_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funds_receipts_claim_idx" ON "claims"."funds_receipts" ("claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "funds_receipts_statement_line_uq" ON "claims"."funds_receipts" ("statement_line_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_claim_idx" ON "claims"."invoices" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_lines_claim_idx" ON "claims"."payout_lines" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_lines_status_idx" ON "claims"."payout_lines" ("law_firm_id", "status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payout_lines_release_kind_uq" ON "claims"."payout_lines" ("payout_release_id", "kind");
