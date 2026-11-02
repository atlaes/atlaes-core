-- Audit fixes (2026-11-02): the authority that certifies the identity
-- confirmation form, separate from the one chosen for the signature
-- (certifying_authority; the GPR app asks both), and the VBL "open a free
-- EUR account" request from the bank-details step ({ phone, consent,
-- requestedAt }), shown to ops on the claim. Idempotent.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "identity_certifying_authority" text;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "eur_account_request" jsonb;
