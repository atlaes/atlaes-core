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
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().optional().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);

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
