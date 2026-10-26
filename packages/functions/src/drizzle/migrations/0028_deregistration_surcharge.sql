-- €50 deregistration surcharge (owner answer 9, 20 Oct 2026): ops flag a
-- claim when the client cannot provide a German deregistration certificate
-- (Abmeldebestätigung). The applied amount is frozen on the release and the
-- funds receipt at "funds received" so the ZE, the invoice and the payout
-- queue all use the same figure. Idempotent.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "deregistration_surcharge" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "deregistration_surcharge_reason" text;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "deregistration_surcharge_set_by" uuid;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "deregistration_surcharge_set_at" timestamp with time zone;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_deregistration_surcharge_set_by_users_id_fk" FOREIGN KEY ("deregistration_surcharge_set_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "claims"."payout_releases" ADD COLUMN IF NOT EXISTS "deregistration_surcharge_eur" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "claims"."funds_receipts" ADD COLUMN IF NOT EXISTS "deregistration_surcharge" numeric(12, 2) DEFAULT '0' NOT NULL;
