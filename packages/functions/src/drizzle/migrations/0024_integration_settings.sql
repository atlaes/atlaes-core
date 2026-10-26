-- Credentials for third-party integrations that ops manage in the admin
-- (first: the Lexware Office API key for invoicing). The value is sealed
-- with AES-256-GCM (services/totp/secret-box.ts); only the last four
-- characters are kept in clear for display. Idempotent.
CREATE TABLE IF NOT EXISTS "shared"."integration_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"secret_encrypted" text NOT NULL,
	"last4" varchar(4) NOT NULL,
	"details" jsonb,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."integration_settings" ADD CONSTRAINT "integration_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
