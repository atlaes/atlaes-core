-- Case type discriminator ("one system", client answer item 8):
-- vbl_refund | bav_cashout | drv_refund. Backfill: private pension type →
-- bAV cash-out, a GPR application link → DRV refund, everything else VBL.
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "case_type" varchar(20);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_case_type_idx" ON "claims"."claims" ("case_type");--> statement-breakpoint
UPDATE "claims"."claims" SET "case_type" = 'bav_cashout' WHERE "case_type" IS NULL AND "pension_type" = 'private';--> statement-breakpoint
UPDATE "claims"."claims" SET "case_type" = 'drv_refund' WHERE "case_type" IS NULL AND "application_id" IS NOT NULL;--> statement-breakpoint
UPDATE "claims"."claims" SET "case_type" = 'vbl_refund' WHERE "case_type" IS NULL;
