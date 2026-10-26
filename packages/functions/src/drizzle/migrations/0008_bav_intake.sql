ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "pension_type" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "salutation" varchar(10);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "tax_id" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "health_insurance_end_date" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "employer_name" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "employment_end_date" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "employer_personnel_number" varchar(50);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_provider_name" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_durchfuehrungsweg" varchar(30);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_contract_reference_label" varchar(50);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_contract_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_provider_form_title" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "drv_refund_received" boolean;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "drv_office" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "drv_decision_date" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_statement_type" varchar(50);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_statement_date" date;--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_benefit_form" varchar(10);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_benefit_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_addressee_type" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_recipient_name" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_recipient_department" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_recipient_street" varchar(255);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_recipient_postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_recipient_city" varchar(100);--> statement-breakpoint
ALTER TABLE "claims"."claims" ADD COLUMN IF NOT EXISTS "bav_recipient_ref" varchar(100);