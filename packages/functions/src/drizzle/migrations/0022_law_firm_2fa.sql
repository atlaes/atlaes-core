-- Two-factor sign-in for the law-firm portal (TOTP) and the optional
-- per-firm IP allowlist. Idempotent.
CREATE TABLE IF NOT EXISTS "shared"."user_totp" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"secret_encrypted" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"enabled_at" timestamp with time zone,
	"last_used_step" bigint,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"recovery_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."user_totp" ADD CONSTRAINT "user_totp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "shared"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared"."law_firm_ip_allowlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"law_firm_id" uuid NOT NULL,
	"cidr" varchar(64) NOT NULL,
	"label" varchar(255),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."law_firm_ip_allowlist" ADD CONSTRAINT "law_firm_ip_allowlist_firm_cidr_unique" UNIQUE ("law_firm_id", "cidr");
EXCEPTION
 WHEN duplicate_object OR duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."law_firm_ip_allowlist" ADD CONSTRAINT "law_firm_ip_allowlist_law_firm_id_law_firms_id_fk" FOREIGN KEY ("law_firm_id") REFERENCES "shared"."law_firms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."law_firm_ip_allowlist" ADD CONSTRAINT "law_firm_ip_allowlist_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
