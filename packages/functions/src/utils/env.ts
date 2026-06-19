import { z } from 'zod';
import { config } from 'dotenv';

// Only load .env file in non-test environments
// Tests set their own environment variables before importing modules
if (process.env.NODE_ENV !== 'test') {
  config({ path: '../../.env' });
}

// Build DATABASE_URL from SST Resource if available, otherwise use env var
function getDatabaseUrl(): string {
  // Check if we're running in SST environment
  if (process.env.SST_RESOURCE_AtlaesDatabase) {
    try {
      const dbResource = JSON.parse(process.env.SST_RESOURCE_AtlaesDatabase);
      const url = `postgresql://${dbResource.username}:${dbResource.password}@${dbResource.host}:${dbResource.port}/${dbResource.database}`;
      console.log('Using SST database resource for connection');
      return url;
    } catch (error) {
      console.error('Failed to parse SST database resource:', error);
    }
  }

  // Fallback to DATABASE_URL env var or default
  const fallback = process.env.DATABASE_URL || 'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';
  console.log('Using DATABASE_URL from environment or default');
  return fallback;
}

const envSchema = z.object({
  DATABASE_URL: z.preprocess(
    () => getDatabaseUrl(),
    z.string()
  ),
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
  // Admin token gating the /api/migrations/run endpoint.
  // CI/CD posts this header after each staging deploy. Rotates via SST secret.
  // Local dev keeps a known default; production requires a real value (guarded below).
  ADMIN_MIGRATION_TOKEN: z
    .string()
    .min(32)
    .default('dev-migration-token-not-for-production-use-only'),
});

export const env = envSchema.parse(process.env);

// Hard guard: refuse to boot in production with the dev default token.
// Prevents an accidental staging/prod deploy from shipping a publicly-known
// migration token.
if (
  env.NODE_ENV === 'production' &&
  env.ADMIN_MIGRATION_TOKEN === 'dev-migration-token-not-for-production-use-only'
) {
  throw new Error(
    'ADMIN_MIGRATION_TOKEN must be set to a real secret in production (>=32 chars). ' +
      'Set it via: AWS_PROFILE=atlaes npx sst secret set AdminMigrationToken <value> --stage <stage>'
  );
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
