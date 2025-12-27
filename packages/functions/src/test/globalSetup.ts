/**
 * Global setup for Vitest
 * This runs ONCE before any test files are loaded
 */
export default async function globalSetup() {
  // Set environment variables before any modules are imported
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';
  process.env.DATABASE_URL = 'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

  console.log('Global test setup complete - JWT_SECRET configured for tests');
}
