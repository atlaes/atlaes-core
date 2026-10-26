CREATE TABLE IF NOT EXISTS "claims"."claim_correspondence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"document_id" uuid,
	"direction" varchar(20) NOT NULL,
	"source" varchar(20) NOT NULL,
	"law_firm_id" uuid,
	"uploaded_by" uuid,
	"received_date" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared"."law_firm_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_firm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "law_firm_members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared"."law_firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_email" varchar(255),
	"notification_email" varchar(255),
	"street" varchar(255),
	"postal_code" varchar(20),
	"city" varchar(100),
	"country" varchar(2) DEFAULT 'DE',
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_id" uuid;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_case_state" varchar(30);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_downloaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_submission_channel" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_response_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "copy_pdf_s3_key" varchar(500);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claim_correspondence" ADD CONSTRAINT "claim_correspondence_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claim_correspondence" ADD CONSTRAINT "claim_correspondence_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claim_correspondence" ADD CONSTRAINT "claim_correspondence_law_firm_id_law_firms_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claim_correspondence" ADD CONSTRAINT "claim_correspondence_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."law_firm_members" ADD CONSTRAINT "law_firm_members_law_firm_id_law_firms_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."law_firm_members" ADD CONSTRAINT "law_firm_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."law_firm_members" ADD CONSTRAINT "law_firm_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_correspondence_claim_id_idx" ON "claims"."claim_correspondence" USING btree ("claim_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_law_firm_id_law_firms_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_law_firm_id_idx" ON "claims"."claims" USING btree ("law_firm_id");--> statement-breakpoint
-- Seed the partner firm. Fixed id so the seed is idempotent and the
-- assignment code can reference it as the default firm.
INSERT INTO "shared"."law_firms" ("id", "name", "contact_email", "street", "postal_code", "city", "country", "active")
VALUES ('4d7c1a2e-5b3f-4c8a-9e1d-2f6b7a8c9d01', 'Vividius Rechtsanwälte', NULL, 'Gneisenaustr. 115', '10961', 'Berlin', 'DE', true)
ON CONFLICT ("id") DO NOTHING;
