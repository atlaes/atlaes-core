-- Submission holds (bAV/VddB staging e2e findings, 2026-10-06): the pension
-- institution of a public-sector claim (VBL/ZVK/VddB/VddKO, previously
-- client-only), the VddB/VddKO stage employment answers, the bAV letter
-- recipient's country (entered by ops with the address), and an ops hold
-- for submitted claims that cannot go out automatically: a bAV claim whose
-- provider address ops still have to enter, a stage claim that ops submit
-- by hand (no VddB/VddKO form yet), or a claim whose package failed to
-- build. Idempotent.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "pension_provider" varchar(100);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "stage_details" jsonb;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_recipient_country" varchar(100);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_hold" varchar(40);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_hold_reason" text;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_hold_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_submission_hold_idx" ON "claims"."claims" USING btree ("submission_hold");
