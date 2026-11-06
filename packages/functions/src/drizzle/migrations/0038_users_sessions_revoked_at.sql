-- Server-side logout: refresh tokens issued before this moment are refused
-- (POST /api/auth/refresh). Access tokens still live out their 15 minutes.
ALTER TABLE "shared"."users" ADD COLUMN IF NOT EXISTS "sessions_revoked_at" timestamp with time zone;
