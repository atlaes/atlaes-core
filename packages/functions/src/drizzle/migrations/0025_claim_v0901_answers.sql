-- Per-case overrides for the V0901 answers ops may change (5.1, 6.1, 6.3,
-- 8.1; owner answer of 20 Oct 2026). NULL = the annotated defaults.
-- Idempotent.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "v0901_answers" jsonb;
