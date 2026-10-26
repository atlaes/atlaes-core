ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "handling_route" varchar(20) DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "handling_route_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "handling_route_set_by" uuid;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "payout_target" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_ref" varchar(100);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_handling_route_set_by_users_id_fk" FOREIGN KEY ("handling_route_set_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
