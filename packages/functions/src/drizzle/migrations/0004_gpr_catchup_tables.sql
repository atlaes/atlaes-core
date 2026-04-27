CREATE TABLE IF NOT EXISTS "gpr"."applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"number_of_jobs" integer,
	"jobs" jsonb,
	"total_months_contributed" integer,
	"earliest_employment_start" date,
	"latest_employment_end" date,
	"state_pension_refund" numeric(10, 2),
	"supplementary_refund" numeric(10, 2),
	"total_refund" numeric(10, 2),
	"calculation_details" jsonb,
	"citizenship" varchar(100),
	"residence" varchar(100),
	"eligibility_result" jsonb,
	"payment_status" varchar(50) DEFAULT 'pending',
	"stripe_payment_id" varchar(255),
	"invoice_number" varchar(50),
	"paid_at" timestamp with time zone,
	"lettershop_submission_id" varchar(255),
	"submitted_at" timestamp with time zone,
	"pdf_s3_key" varchar(500),
	"workflow_state" varchar(50) DEFAULT 'draft',
	"workflow_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gpr"."calculation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"session_id" uuid,
	"input_data" jsonb NOT NULL,
	"rules_version" varchar(20),
	"calculation_result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gpr"."workflow_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"state" varchar(50) NOT NULL,
	"previous_state" varchar(50),
	"triggered_by" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gpr"."applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gpr"."calculation_logs" ADD CONSTRAINT "calculation_logs_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "gpr"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gpr"."calculation_logs" ADD CONSTRAINT "calculation_logs_session_id_pending_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "gpr"."pending_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gpr"."workflow_states" ADD CONSTRAINT "workflow_states_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "gpr"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
