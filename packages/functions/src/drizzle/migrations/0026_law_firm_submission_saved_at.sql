-- When the law firm saved the submission date (owner's answer 20 Oct
-- 2026): the firm may re-download the frozen pack for 24 hours from this
-- moment; the entered submission date itself can lie in the past.
-- Idempotent.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "law_firm_submission_saved_at" timestamp with time zone;
