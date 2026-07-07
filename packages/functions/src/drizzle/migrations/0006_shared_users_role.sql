ALTER TABLE "shared"."users" ADD COLUMN IF NOT EXISTS "role" varchar(20) DEFAULT 'user';
