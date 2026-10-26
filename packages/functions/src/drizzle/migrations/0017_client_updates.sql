-- Client-update engine (Rules for Karl, 16 Sep 2026). Case fields on the
-- claim: the one clock (submission_date = the law firm's posting date),
-- the current office, the communication owner, the promised client date,
-- the open customer task and the next office action. Decision/funds
-- timestamps stop the waiting sequence and feed the A1–A3 mails.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "pension_office" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_date" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "communication_owner" varchar(100) DEFAULT 'Trixie';--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "communication_owner_email" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "reviewer_name" varchar(100);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "reviewer_role" varchar(60);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "case_manager_signature" text;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "next_client_update_due" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "last_client_update_sent" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "open_customer_task" jsonb;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "next_office_action" jsonb;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "decision_received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "funds_received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "funds_before_decision" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "client_update_stopped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "client_update_stop_reason" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "senior_review_task_created_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_next_client_update_due_idx" ON "claims"."claims" ("next_client_update_due");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."client_contact_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"contact_date" date NOT NULL,
	"logged_by" uuid,
	"logged_by_name" varchar(100),
	"channel" varchar(20) NOT NULL,
	"type" varchar(30) NOT NULL,
	"outcome" text NOT NULL,
	"summary_en" text,
	"uncertain" boolean DEFAULT false NOT NULL,
	"customer_action" text,
	"customer_action_due" date,
	"update_warranted" boolean DEFAULT false NOT NULL,
	"status_paragraph" varchar(40),
	"info_request_source" varchar(30),
	"new_office" varchar(255),
	"details" jsonb,
	"template_key" varchar(20),
	"draft_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."client_update_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"kind" varchar(30) NOT NULL,
	"template_key" varchar(20),
	"trigger" varchar(40) NOT NULL,
	"contact_log_id" uuid,
	"assigned_to" varchar(100) NOT NULL,
	"assigned_to_email" varchar(255),
	"due_date" date NOT NULL,
	"draft_subject" text,
	"draft_body" text,
	"draft_html" text,
	"unresolved_placeholders" jsonb DEFAULT '[]'::jsonb,
	"variables" jsonb,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"notified_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"sent_by" uuid,
	"sent_subject" text,
	"sent_body" text,
	"promised_update_date" date,
	"superseded_by_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."client_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"received_date" date,
	"note" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims"."client_task_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"customer_task_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_contact_log" ADD CONSTRAINT "client_contact_log_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_contact_log" ADD CONSTRAINT "client_contact_log_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_update_tasks" ADD CONSTRAINT "client_update_tasks_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_update_tasks" ADD CONSTRAINT "client_update_tasks_contact_log_id_client_contact_log_id_fk" FOREIGN KEY ("contact_log_id") REFERENCES "claims"."client_contact_log"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_update_tasks" ADD CONSTRAINT "client_update_tasks_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_letters" ADD CONSTRAINT "client_letters_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_letters" ADD CONSTRAINT "client_letters_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_letters" ADD CONSTRAINT "client_letters_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_letters" ADD CONSTRAINT "client_letters_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_task_documents" ADD CONSTRAINT "client_task_documents_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "claims"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_task_documents" ADD CONSTRAINT "client_task_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "shared"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims"."client_task_documents" ADD CONSTRAINT "client_task_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "shared"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_contact_log_claim_id_idx" ON "claims"."client_contact_log" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_update_tasks_claim_id_idx" ON "claims"."client_update_tasks" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_update_tasks_status_idx" ON "claims"."client_update_tasks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_letters_claim_id_idx" ON "claims"."client_letters" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_task_documents_claim_id_idx" ON "claims"."client_task_documents" ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_task_documents_task_id_idx" ON "claims"."client_task_documents" ("customer_task_id");
