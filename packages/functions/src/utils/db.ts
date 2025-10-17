import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';

// Create the connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 10 });

// Create the database instance
export const db = drizzle(client, { schema });

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
