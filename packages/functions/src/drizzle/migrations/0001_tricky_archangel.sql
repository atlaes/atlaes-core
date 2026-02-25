CREATE SCHEMA "gpr";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gpr"."pending_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"number_of_jobs" integer NOT NULL,
	"jobs" jsonb NOT NULL,
	"calculation_result" jsonb NOT NULL,
	"citizenship" varchar(100),
	"residence" varchar(100),
	"last_employment_month" varchar(20),
	"last_employment_year" varchar(4),
	"contribution_duration" varchar(50),
	"date_of_birth" date,
	"eligibility_result" jsonb,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pending_sessions_email_unique" UNIQUE("email")
);
