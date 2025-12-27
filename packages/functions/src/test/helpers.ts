import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';
import { users, profiles } from '../drizzle/schema/shared';
import { AuthService } from '../utils/auth';

// Test database connection
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

const testClient = postgres(TEST_DATABASE_URL, { max: 5 });
export const testDb = drizzle(testClient, { schema });

// JWT secret for tests
const TEST_JWT_SECRET =
  process.env.JWT_SECRET ||
  'test-jwt-secret-key-for-testing-purposes-only-32-chars';

/**
 * Generate a valid UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(
  userId: string,
  email: string,
  options: { expiresIn?: string; emailVerified?: boolean } = {}
): string {
  const { expiresIn = '1h', emailVerified = true } = options;

  return jwt.sign(
    {
      userId,
      email,
      emailVerified,
    },
    TEST_JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Create a test user in the database and return user data with auth token
 */
export async function createTestUser(
  overrides: {
    email?: string;
    firstName?: string;
    lastName?: string;
    passwordHash?: string;
    emailVerified?: boolean;
  } = {}
): Promise<{
  user: typeof users.$inferSelect;
  profile: typeof profiles.$inferSelect;
  token: string;
  refreshToken: string;
}> {
  const userId = generateUUID();
  const email = overrides.email || `test-${Date.now()}@example.com`;

  // Create user
  const [user] = await testDb
    .insert(users)
    .values({
      id: userId,
      email,
      emailVerified: overrides.emailVerified ?? true,
      passwordHash: overrides.passwordHash || null,
      authProvider: 'magic_link',
    })
    .returning();

  // Create profile
  const [profile] = await testDb
    .insert(profiles)
    .values({
      userId: user.id,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
    })
    .returning();

  // Generate tokens
  const tokens = AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: user.emailVerified ?? true,
  });

  return {
    user,
    profile,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Clean up a specific test user and related data
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  // Delete in order due to foreign key constraints
  await testDb.delete(schema.claimDocuments).where(
    // Use a subquery approach - delete documents for claims owned by this user
    // This is simplified - in production you'd use proper subqueries
  );
  await testDb.delete(schema.claimsTable).where(
    // Same approach for claims
  );
  await testDb.delete(profiles).where(
    // Delete profile
  );
  await testDb.delete(users).where(
    // Delete user
  );
}

/**
 * Clean up all test data (users with test email patterns)
 */
export async function cleanupAllTestData(): Promise<void> {
  // Delete test users and their related data
  // Users with emails matching test patterns
  const testEmailPattern = '%test-%@example.com';

  try {
    // Get all test user IDs first
    const testUsers = await testClient`
      SELECT id FROM shared.users
      WHERE email LIKE ${testEmailPattern}
    `;

    if (testUsers.length === 0) return;

    const userIds = testUsers.map((u) => u.id);

    // Delete in order due to FK constraints
    await testClient`
      DELETE FROM claims.claim_documents
      WHERE claim_id IN (
        SELECT id FROM claims.claims WHERE user_id = ANY(${userIds})
      )
    `;

    await testClient`
      DELETE FROM claims.claim_workflow_states
      WHERE claim_id IN (
        SELECT id FROM claims.claims WHERE user_id = ANY(${userIds})
      )
    `;

    await testClient`
      DELETE FROM claims.claims WHERE user_id = ANY(${userIds})
    `;

    await testClient`
      DELETE FROM gpr.pending_sessions WHERE email LIKE ${testEmailPattern}
    `;

    await testClient`
      DELETE FROM gpr.applications WHERE user_id = ANY(${userIds})
    `;

    await testClient`
      DELETE FROM shared.profiles WHERE user_id = ANY(${userIds})
    `;

    await testClient`
      DELETE FROM shared.users WHERE id = ANY(${userIds})
    `;

    console.log(`Cleaned up ${testUsers.length} test users`);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Create authorization header for requests
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Wait for a specified time (useful for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a magic link token for testing
 */
export function generateTestMagicLinkToken(email: string): string {
  return AuthService.generateMagicLinkToken(email);
}

/**
 * Create a test app instance with a specific route for isolated testing
 */
export function createTestApp(router: Hono): Hono {
  const app = new Hono();
  app.route('/', router);
  return app;
}

/**
 * Close test database connection
 */
export async function closeTestDb(): Promise<void> {
  await testClient.end();
}
