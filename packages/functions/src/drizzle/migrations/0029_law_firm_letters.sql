-- Return channel (owner answer 6, 20 Oct 2026): the law firm bulk-uploads
-- scanned DRV letters in the portal, not tied to a case. Each file is
-- OCR'd, classified and matched within the firm's cases (VSNR + name, or
-- the firm's AZ); one confident match files it to the case, everything
-- else waits in the ATLAES "needs attention" queue. Idempotent.
CREATE TABLE IF NOT EXISTS "claims"."law_firm_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_firm_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"document_id" uuid,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"file_sha256" varchar(64) NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"status" varchar(20) NOT NULL,
	"ocr_status" varchar(20) NOT NULL,
	"ocr_error" text,
	"ocr_text" text,
	"extracted" jsonb,
	"letter_type" varchar(30) NOT NULL DEFAULT 'other',
	"match_method" varchar(20),
	"match_reason" varchar(30) NOT NULL,
	"claim_id" uuid,
	"candidate_claim_ids" jsonb,
	"correspondence_id" uuid,
	"next_step_status" varchar(20),
	"next_step_action" varchar(30),
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"handled_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."law_firm_letters" ADD CONSTRAINT "law_firm_letters_law_firm_id_law_firms_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."law_firm_letters" ADD CONSTRAINT "law_firm_letters_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."law_firm_letters" ADD CONSTRAINT "law_firm_letters_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "shared"."documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."law_firm_letters" ADD CONSTRAINT "law_firm_letters_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."law_firm_letters" ADD CONSTRAINT "law_firm_letters_correspondence_id_claim_correspondence_id_fk" FOREIGN KEY ("correspondence_id") REFERENCES "claims"."claim_correspondence"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."law_firm_letters" ADD CONSTRAINT "law_firm_letters_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "law_firm_letters_firm_idx" ON "claims"."law_firm_letters" ("law_firm_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "law_firm_letters_attention_idx" ON "claims"."law_firm_letters" ("status", "next_step_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "law_firm_letters_claim_idx" ON "claims"."law_firm_letters" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "law_firm_letters_hash_idx" ON "claims"."law_firm_letters" ("law_firm_id", "file_sha256");
