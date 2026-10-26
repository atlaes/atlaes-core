ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_released_by" uuid;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_rereleased_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_overdue_warned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "vsnr" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "sex" varchar(10);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "birth_name" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "german_contribution_months" integer;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_pack_s3_key" varchar(500);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_pack_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_pack_manifest" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_law_firm_released_by_users_id_fk" FOREIGN KEY ("law_firm_released_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "claims"."claims" SET "law_firm_released_at" = coalesce("law_firm_assigned_at", now()) WHERE "handling_route" = 'law_firm' AND "law_firm_id" IS NOT NULL AND "law_firm_released_at" IS NULL;
