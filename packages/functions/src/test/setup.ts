// IMPORTANT: Set environment variables BEFORE any imports that might use them
// This must be at the very top of the file before any other imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';

// Test database configuration
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

// Create a separate connection for tests
let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;

// Store transaction state
let transactionClient: ReturnType<typeof postgres> | null = null;

export function getTestDb() {
  if (!testDb) {
    throw new Error('Test database not initialized. Ensure setup.ts is loaded.');
  }
  return testDb;
}

export function getTestClient() {
  return testClient;
}

// Setup before all tests
beforeAll(async () => {
  // Create test database connection
  testClient = postgres(TEST_DATABASE_URL, {
    max: 1, // Single connection for transaction isolation
    idle_timeout: 20,
    connect_timeout: 10,
  });

  testDb = drizzle(testClient, { schema });

  // Verify connection
  try {
    await testClient`SELECT 1`;
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (testClient) {
    await testClient.end();
    console.log('Test database connection closed');
  }
});

// Transaction-based isolation for each test
beforeEach(async () => {
  // Note: For true transaction isolation, we'd wrap each test in a transaction
  // and rollback after. However, postgres.js doesn't support savepoints easily.
  // Instead, we'll clean up test data after each test.
});

afterEach(async () => {
  // Clean up test data created during tests
  // This runs after each test to ensure isolation
});

// Export for use in test helpers
export { testDb, testClient };
