CREATE TABLE IF NOT EXISTS "claims"."contract_withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" varchar(255),
	"email" varchar(255),
	"pension_type_or_institution" varchar(255),
	"contract_date" timestamp with time zone,
	"payment_date" timestamp with time zone,
	"policy_version" varchar(100) NOT NULL,
	"declaration_text" text NOT NULL,
	"application_already_submitted" boolean DEFAULT false NOT NULL,
	"revocation_required" boolean DEFAULT false NOT NULL,
	"revocation_task_created_at" timestamp with time zone,
	"revocation_method_sent" varchar(50),
	"revocation_institution" varchar(255),
	"revocation_destination" varchar(500),
	"revocation_notice_copy" text,
	"revocation_delivery_status" varchar(50),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "contract_withdrawals_claim_id_unique" UNIQUE("claim_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."contract_withdrawals" ADD CONSTRAINT "contract_withdrawals_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."contract_withdrawals" ADD CONSTRAINT "contract_withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
