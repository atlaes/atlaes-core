-- Direct client submission for DRV refunds and route × status bAV letters
-- (owner spec 29 Oct 2026). Idempotent.
--
-- 1. ops_settings: plain configuration ops edit in the admin, e.g. the
--    postal authority's correspondence address (Anna Kliem) and the
--    direct-route dispatch operator.
-- 2. claims: bAV claim status chosen by admin (vested / non_vested, NULL =
--    derived from drv_refund_received), the non-vested application title,
--    and the direct-route release and dispatch record (who sent it, how,
--    when). Download or release alone never marks a claim submitted.
-- 3. bav_providers: dropdown label; seeded with the six providers the
--    owner sent (only when no provider with that label or name exists).
CREATE TABLE IF NOT EXISTS "shared"."ops_settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared"."ops_settings" ADD CONSTRAINT "ops_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "shared"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_claim_status" varchar(20);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_application_title" varchar(255);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "provider_refund_benefit" varchar(40);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "direct_pack_released_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "direct_pack_released_by" uuid;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_dispatched_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_dispatched_by" varchar(200);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_dispatch_method" varchar(40);
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_dispatch_recorded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "submission_dispatch_recorded_by" uuid;
--> statement-breakpoint
ALTER TABLE "claims"."bav_providers" ADD COLUMN IF NOT EXISTS "short_name" varchar(60);
--> statement-breakpoint
INSERT INTO "claims"."bav_providers" ("short_name", "name", "department", "street", "postal_code", "city", "country", "default_addressee_type")
SELECT v.short_name, v.name, v.department, v.street, v.postal_code, v.city, 'Deutschland', 'provider'
FROM (VALUES
	('BVV', 'BVV Versicherungsverein des Bankgewerbes a.G.', NULL, 'Straße der Pariser Kommune 8', '10243', 'Berlin'),
	('VBL', 'VBL Versorgungsanstalt des Bundes und der Länder', 'Kundenservice', NULL, '76240', 'Karlsruhe'),
	('KVBW ZVK', 'Kommunaler Versorgungsverband Baden-Württemberg', 'Zusatzversorgungskasse', 'Postfach 10 01 61', '76231', 'Karlsruhe'),
	('Versorgungsausgleichskasse', 'Versorgungsausgleichskasse Pensionskasse VVaG', NULL, NULL, '10850', 'Berlin'),
	('VddB', 'Versorgungsanstalt der deutschen Bühnen', NULL, 'Postfach 81 08 51', '81901', 'München'),
	('VddKO', 'Versorgungsanstalt der deutschen Kulturorchester', NULL, 'Postfach 81 08 52', '81901', 'München')
) AS v(short_name, name, department, street, postal_code, city)
WHERE NOT EXISTS (
	SELECT 1 FROM "claims"."bav_providers" p
	WHERE lower(p."name") = lower(v.name) OR lower(coalesce(p."short_name", '')) = lower(v.short_name)
);
