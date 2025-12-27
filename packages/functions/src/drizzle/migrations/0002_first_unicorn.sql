CREATE SCHEMA "claims";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."claim_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"document_role" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."claim_workflow_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"state" varchar(50) NOT NULL,
	"previous_state" varchar(50),
	"triggered_by" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid,
	"status" varchar(50) DEFAULT 'draft',
	"workflow_state" varchar(50) DEFAULT 'personal_info',
	"workflow_history" jsonb DEFAULT '[]'::jsonb,
	"completed_steps" jsonb DEFAULT '{}'::jsonb,
	"claim_type" varchar(50),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"date_of_birth" date,
	"gender" varchar(20),
	"place_of_birth" varchar(100),
	"nationality" varchar(100),
	"passport_number" varchar(50),
	"passport_issue_date" date,
	"passport_expiry_date" date,
	"current_address_line1" varchar(255),
	"current_address_line2" varchar(255),
	"current_city" varchar(100),
	"current_postal_code" varchar(20),
	"current_country" varchar(100),
	"sv_nummer" varchar(50),
	"german_street" varchar(255),
	"german_postal_code" varchar(20),
	"german_city" varchar(100),
	"move_out_date" date,
	"abmeldung_method" varchar(50),
	"deregistration_service_requested" boolean DEFAULT false,
	"preferred_currency" varchar(10),
	"account_holder_name" varchar(255),
	"bank_name" varchar(255),
	"account_number" varchar(50),
	"bsb" varchar(20),
	"swift_bic" varchar(20),
	"iban" varchar(50),
	"bank_street" varchar(255),
	"bank_city" varchar(100),
	"bank_postal_code" varchar(20),
	"bank_country" varchar(100),
	"signature_id" uuid,
	"signature_completed_at" timestamp with time zone,
	"identity_form_downloaded_at" timestamp with time zone,
	"certifying_authority" varchar(50),
	"identity_verified_at" timestamp with time zone,
	"confirmation_accuracy_accepted" boolean DEFAULT false,
	"confirmation_authorization_accepted" boolean DEFAULT false,
	"payment_status" varchar(50) DEFAULT 'pending',
	"stripe_payment_id" varchar(255),
	"service_fee" numeric(10, 2),
	"paid_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"pdf_s3_key" varchar(500),
	"lettershop_submission_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claim_documents" ADD CONSTRAINT "claim_documents_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claim_documents" ADD CONSTRAINT "claim_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claim_workflow_states" ADD CONSTRAINT "claim_workflow_states_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "gpr"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."claims" ADD CONSTRAINT "claims_signature_id_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "shared"."signatures"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
