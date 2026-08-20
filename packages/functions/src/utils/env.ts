import { z } from 'zod';
import { config } from 'dotenv';
import { Resource } from 'sst';

// Only load .env file in non-test environments
// Tests set their own environment variables before importing modules
if (process.env.NODE_ENV !== 'test') {
  config({ path: '../../.env' });
}

// Name of the Postgres resource linked in resources/database/index.ts.
const DATABASE_LINK_NAME = 'AtlaesDatabase';

/**
 * Build DATABASE_URL from the linked SST Postgres resource, falling back to a
 * plain env var for local development.
 *
 * SST delivers links differently depending on the compute type:
 *   - `sst.aws.Service` (the Fargate backend) receives `SST_RESOURCE_*` env vars.
 *   - `sst.aws.Function` (Lambda, e.g. the Stripe webhook) receives an
 *     AES-encrypted `resource.enc` bundle, referenced by `SST_KEY_FILE`/`SST_KEY`,
 *     and gets no `SST_RESOURCE_<name>` variable at all.
 *
 * `Resource` from the `sst` package reads both, so never hand-parse
 * `SST_RESOURCE_AtlaesDatabase`: that path works on Fargate but silently
 * degrades to the localhost fallback on Lambda, which cannot reach RDS.
 */
function getDatabaseUrl(): string {
  // `Resource` is a Proxy that throws for names that aren't linked, so probe
  // with `in` instead of a truthiness check.
  if (DATABASE_LINK_NAME in Resource) {
    const dbResource = Resource[DATABASE_LINK_NAME];
    console.log('Using SST database resource for connection');
    return `postgresql://${dbResource.username}:${dbResource.password}@${dbResource.host}:${dbResource.port}/${dbResource.database}`;
  }

  // Fallback to DATABASE_URL env var or default
  const fallback =
    process.env.DATABASE_URL ||
    'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';
  console.log('Using DATABASE_URL from environment or default');
  return fallback;
}

const envSchema = z.object({
  DATABASE_URL: z.preprocess(() => getDatabaseUrl(), z.string()),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  JWT_SECRET: z
    .string()
    .min(32)
    .default('your-super-secret-jwt-key-change-this-in-production'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3001'),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Apple Sign-In
  APPLE_CLIENT_ID: z.string().optional(), // Service ID (e.g., com.yourapp.auth)
  APPLE_TEAM_ID: z.string().optional(), // Your Apple Team ID
  APPLE_KEY_ID: z.string().optional(), // Key ID from Apple Developer Console
  APPLE_PRIVATE_KEY: z.string().optional(), // Private key contents (PEM format)
  // Frontend URL for OAuth callbacks and magic links
  FRONTEND_URL: z.string().optional().default('http://localhost:3000'),
  // SES email
  SES_FROM_EMAIL: z.string().optional().default('noreply@companypension.de'),
  SES_REGION: z.string().optional().default('eu-central-1'),
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Mistral OCR / extraction
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_OCR_MODEL: z.string().optional().default('mistral-ocr-latest'),
  MISTRAL_EXTRACTION_MODEL: z
    .string()
    .optional()
    .default('mistral-large-latest'),
  // Admin token gating the /api/migrations/run endpoint.
  // CI/CD posts this header after each staging deploy. Rotates via SST secret.
  // Local dev keeps a known default; production requires a real value (guarded below).
  ADMIN_MIGRATION_TOKEN: z
    .string()
    .min(32)
    .default('dev-migration-token-not-for-production-use-only'),
  // Lettershop (onlinebrief24.de) REST API delivery. The API-Key/Secret pair
  // is generated in the Kundencenter under Einstellungen > API Zugang.
  LETTERSHOP_API_BASE_URL: z
    .string()
    .url()
    .default('https://api.onlinebrief24.de/v1'),
  LETTERSHOP_API_KEY: z.string().optional(),
  LETTERSHOP_API_SECRET: z.string().optional(),
  // Sent as auth.mode on every request: 'test' parks the order in the
  // vendor's shopping cart (reviewable, auto-deleted after 7 days, never
  // printed or billed), 'live' processes it directly. 'off' is ours, not
  // theirs — it skips the call entirely.
  LETTERSHOP_MODE: z.enum(['test', 'live', 'off']).default('test'),
});

export const env = envSchema.parse(process.env);

/**
 * Hard guard: refuse to boot the backend in production with the dev default
 * token. Prevents an accidental staging/prod deploy from shipping a
 * publicly-known migration token.
 *
 * Deliberately a function called from the Hono entrypoint rather than a
 * module-scope side effect. `env.ts` is imported transitively by Lambda
 * entrypoints (stripe-webhook -> PaymentService -> utils/db -> utils/env)
 * which run with NODE_ENV=production but are never linked to the
 * AdminMigrationToken secret — only the backend serves /api/migrations/run.
 * Throwing at import time killed those functions during init, before their
 * handler ever ran.
 */
export function assertMigrationTokenConfigured(): void {
  if (
    env.NODE_ENV === 'production' &&
    env.ADMIN_MIGRATION_TOKEN ===
      'dev-migration-token-not-for-production-use-only'
  ) {
    throw new Error(
      'ADMIN_MIGRATION_TOKEN must be set to a real secret in production (>=32 chars). ' +
        'Set it via: AWS_PROFILE=atlaes npx sst secret set AdminMigrationToken <value> --stage <stage>'
    );
  }
}

export type Env = z.infer<typeof envSchema>;

/**
 * Get JWT secret dynamically.
 * In test environments, this reads from process.env to support runtime changes.
 * In production, uses the cached env value for performance.
 */
export function getJwtSecret(): string {
  if (process.env.NODE_ENV === 'test') {
    return process.env.JWT_SECRET || env.JWT_SECRET;
  }
  return env.JWT_SECRET;
}
