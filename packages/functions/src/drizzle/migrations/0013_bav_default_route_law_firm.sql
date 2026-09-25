ALTER TABLE "claims"."claims" ALTER COLUMN "handling_route" DROP DEFAULT;--> statement-breakpoint
-- bAV cash-out claims go via the partner law firm unless ops chose a route
-- explicitly (client answer, 15 Sep 2026). Rows that only carry the old
-- column default ('direct' with no handling_route_set_at) are reset to NULL
-- so the application-level default applies.
UPDATE "claims"."claims" SET "handling_route" = NULL WHERE "pension_type" = 'private' AND "handling_route" = 'direct' AND "handling_route_set_at" IS NULL;
