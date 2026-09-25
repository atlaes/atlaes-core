import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';
import { env } from './env';

// Create the connection
const connectionString = env.DATABASE_URL;

// Drizzle 0.31 already JSON.stringifies json/jsonb values before handing
// them to postgres.js, whose default serializer stringifies again. That
// stored every jsonb column (audit details, workflow metadata,
// completed_steps, …) as a JSON *string*; Drizzle reads re-parsed it, so the
// app never noticed, but raw SQL readers and jsonb operators saw a string.
// Pass JSON text through untouched; still encode plain objects from raw
// `sql` templates.
const jsonPassthrough = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value);

const client = postgres(connectionString, {
  max: 10,
  serializers: { 114: jsonPassthrough, 3802: jsonPassthrough },
});

// Create the database instance
export const db = drizzle(client, { schema });

// Run pending schema migrations (safe to call repeatedly)
export async function runStartupMigrations() {
  try {
    await client`ALTER TABLE shared.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`;
    console.log('Startup migrations: schema verified');
  } catch (error) {
    console.error('Startup migrations failed:', error);
  }
}

// Health check function
export async function checkDatabaseConnection() {
  try {
    await client`SELECT 1`;
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  await client.end();
}
