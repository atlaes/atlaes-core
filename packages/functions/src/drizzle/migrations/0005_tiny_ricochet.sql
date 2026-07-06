ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_type" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_provider_name" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_provider_address" varchar(500);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_insured_since_month" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_insured_since_year" varchar(4);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_place_of_birth" varchar(100);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_country_of_birth" varchar(100);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN "health_insurance_number" varchar(50);