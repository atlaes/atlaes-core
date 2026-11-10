-- GPR eligibility check (/check/3-step, rule set GPR-ELIG-2026-11-10):
-- the browser runs the check; the backend stores a lead row for the
-- "remind me" opt-in, the free-review request and the funnel sign-up
-- (types gpr-elig-reminder / gpr-elig-review / gpr-elig-signup).
ALTER TABLE "gpr"."leads" ADD COLUMN IF NOT EXISTS "rule_set" varchar(40);--> statement-breakpoint
ALTER TABLE "gpr"."leads" ADD COLUMN IF NOT EXISTS "result" varchar(30);--> statement-breakpoint
ALTER TABLE "gpr"."leads" ADD COLUMN IF NOT EXISTS "block_reason" varchar(40);--> statement-breakpoint
ALTER TABLE "gpr"."leads" ADD COLUMN IF NOT EXISTS "answers" jsonb;--> statement-breakpoint
ALTER TABLE "gpr"."leads" ADD COLUMN IF NOT EXISTS "file_from" date;--> statement-breakpoint
ALTER TABLE "gpr"."leads" ADD COLUMN IF NOT EXISTS "attested_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_type_created_idx" ON "gpr"."leads" USING btree ("type","created_at");
