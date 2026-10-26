-- bAV payout on the Anderkonto with the fee split (client answer item 5).
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_payout_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_payout_value_date" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_fee_eur" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_law_firm_fee_deducted" boolean;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_settlement_list" boolean;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_payout_recorded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_payout_recorded_by" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_bav_payout_recorded_by_users_id_fk" FOREIGN KEY ("bav_payout_recorded_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Extra documents (item 6) reuse claims.claim_documents with the role
-- 'bav_extra'; the role column is a plain varchar, so no schema change.
-- bAV provider matrix (item 7): letter address per known provider.
CREATE TABLE IF NOT EXISTS "claims"."bav_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"default_addressee_type" varchar(20),
	"department" varchar(255),
	"street" varchar(255),
	"postal_code" varchar(20),
	"city" varchar(100),
	"country" varchar(100),
	"requires_bank_address" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bav_providers_name_idx" ON "claims"."bav_providers" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bav_providers_name_lower_uidx" ON "claims"."bav_providers" (lower("name"));
