import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';
import { env } from './env';

// Create the connection
const connectionString = env.DATABASE_URL;
const client = postgres(connectionString, { max: 10 });

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
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  await client.end();
}
