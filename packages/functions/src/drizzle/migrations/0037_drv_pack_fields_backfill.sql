-- DRV refund claims saved the SV number and passport gender only under the
-- intake names (sv_nummer, gender); the DRV pack reads vsnr and sex. Copy
-- them over where the pack columns are still empty. New saves write both
-- (ClaimsApplicationService.updateClaim → drvPackPatch).
UPDATE "claims"."claims"
SET "vsnr" = upper(regexp_replace("sv_nummer", '\s', '', 'g'))
WHERE "case_type" = 'drv_refund'
  AND "vsnr" IS NULL
  AND "sv_nummer" IS NOT NULL
  AND length(regexp_replace("sv_nummer", '\s', '', 'g')) BETWEEN 1 AND 20;
--> statement-breakpoint
UPDATE "claims"."claims"
SET "sex" = CASE "gender"
  WHEN 'male' THEN 'male'
  WHEN 'female' THEN 'female'
  WHEN 'other' THEN 'diverse'
END
WHERE "case_type" = 'drv_refund'
  AND "sex" IS NULL
  AND "gender" IN ('male', 'female', 'other');
