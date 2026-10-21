-- Payout accounts managed by ops in the admin (Settings → Payout accounts):
-- the ATLAES account (payout queue line 1, shown on the payment
-- declaration) and the provider collection accounts for route B. Account
-- data is configuration entered by ops, never code. Idempotent.
CREATE TABLE IF NOT EXISTS "shared"."payout_accounts" (
	"key" varchar(40) PRIMARY KEY NOT NULL,
	"holder" varchar(200) NOT NULL,
	"iban" varchar(42) NOT NULL,
	"bic" varchar(11),
	"bank" varchar(200),
	"reference" varchar(140),
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."payout_accounts" ADD CONSTRAINT "payout_accounts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
