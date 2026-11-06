import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { users, profiles } from '../drizzle/schema/shared';
import { pendingSessions } from '../drizzle/schema/gpr';
import auth from './auth';
import { AuthService } from '../utils/auth';
import { gprSessionData } from '../test/fixtures';

// Test database connection
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;

// Test app
let app: Hono;

// Tracking created test data
const createdUserIds: string[] = [];
const createdSessionEmails: string[] = [];

describe('Auth Routes', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET =
      'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });

    // Create test app
    app = new Hono();
    app.route('/api/auth', auth);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  beforeEach(async () => {
    // Clear data before each test
  });

  afterEach(async () => {
    await cleanupTestData();
    createdUserIds.length = 0;
    createdSessionEmails.length = 0;
  });

  async function cleanupTestData() {
    try {
      // Clean up pending sessions
      for (const email of createdSessionEmails) {
        await testClient`
          DELETE FROM gpr.pending_sessions WHERE email = ${email.toLowerCase()}
        `;
      }

      // Clean up users
      for (const userId of createdUserIds) {
        await testClient`
          DELETE FROM gpr.applications WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM claims.claims WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.audit_logs WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.profiles WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.users WHERE id = ${userId}::uuid
        `;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Helper to create test user via magic link
  async function createTestUserWithToken(): Promise<{
    user: typeof users.$inferSelect;
    token: string;
    refreshToken: string;
  }> {
    const email = uniqueEmail();
    createdSessionEmails.push(email);

    // Request and verify magic link
    const reqRes = await request('POST', '/api/auth/magic-link/request', {
      email,
    });
    const reqData = (await reqRes.json()) as any;
    const token = new URL(reqData.magicLink).searchParams.get('token');

    const verifyRes = await request('POST', '/api/auth/magic-link/verify', {
      token,
    });
    const verifyData = (await verifyRes.json()) as any;

    if (verifyData.user?.id) createdUserIds.push(verifyData.user.id);

    return {
      user: verifyData.user,
      token: verifyData.tokens.accessToken,
      refreshToken: verifyData.tokens.refreshToken,
    };
  }

  // Each request comes from its own address: the magic-link route is rate
  // limited per client IP and the suite would otherwise exhaust it.
  let requestCount = 0;
  function nextClientIp(): string {
    requestCount += 1;
    return `198.18.${Math.floor(requestCount / 250) % 250}.${requestCount % 250}`;
  }

  // Helper to make requests
  async function request(
    method: string,
    path: string,
    body?: object,
    headers?: Record<string, string>
  ) {
    const req = new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': nextClientIp(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return app.fetch(req);
  }

  // Helper to generate unique test email
  function uniqueEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  }

  // ============================================================
  // Magic Link Request Tests
  // ============================================================

  describe('POST /api/auth/magic-link/request', () => {
    it('generates magic link for any email', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      const res = await request('POST', '/api/auth/magic-link/request', {
        email,
      });

      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.message).toBe('Magic link sent to your email address.');
      expect(data.magicLink).toBeDefined();
      expect(data.magicLink).toContain('token=');
    });

    it('saves GPR session data when provided', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      const res = await request('POST', '/api/auth/magic-link/request', {
        email,
        gprSessionData: {
          calculatorData: gprSessionData.calculatorData,
          eligibilityData: gprSessionData.eligibilityData,
        },
      });

      const data = (await res.json()) as any;
      expect(res.status).toBe(200);

      // Verify session was saved
      const sessions = await testDb
        .select()
        .from(pendingSessions)
        .where(eq(pendingSessions.email, email.toLowerCase()))
        .limit(1);

      expect(sessions.length).toBe(1);
      expect(sessions[0].numberOfJobs).toBe(
        gprSessionData.calculatorData.numberOfJobs
      );
    });

    it('returns 400 for invalid email', async () => {
      const res = await request('POST', '/api/auth/magic-link/request', {
        email: 'not-an-email',
      });

      expect(res.status).toBe(400);
    });

    it('appends a same-origin redirect path to the link', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      const res = await request('POST', '/api/auth/magic-link/request', {
        email,
        redirectUrl: '/claims/abc?step=2',
      });
      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(new URL(data.magicLink).searchParams.get('redirect')).toBe(
        '/claims/abc?step=2'
      );
    });

    it('rejects redirect targets that would leave the origin', async () => {
      const email = uniqueEmail();

      for (const redirectUrl of [
        '//evil.com',
        '/\\evil.com',
        '/\\\\evil.com',
        'https://evil.com',
        'claims',
      ]) {
        const res = await request('POST', '/api/auth/magic-link/request', {
          email,
          redirectUrl,
        });
        expect(res.status, redirectUrl).toBe(400);
      }
    });

    it('returns the link to an allowed callback origin and ignores others', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      const allowed = await request('POST', '/api/auth/magic-link/request', {
        email,
        callbackUrl: 'https://www.companypension.de',
      });
      const allowedData = (await allowed.json()) as any;
      expect(allowed.status).toBe(200);
      expect(
        allowedData.magicLink.startsWith(
          'https://www.companypension.de/auth/magic-link?token='
        )
      ).toBe(true);

      const other = await request('POST', '/api/auth/magic-link/request', {
        email,
        callbackUrl: 'https://evil.com',
      });
      const otherData = (await other.json()) as any;
      expect(other.status).toBe(200);
      expect(otherData.magicLink.startsWith('https://evil.com')).toBe(false);
    });

    it('limits sign-in link requests per e-mail address', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await request('POST', '/api/auth/magic-link/request', {
          email,
        });
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses[5]).toBe(429);
    });
  });

  // ============================================================
  // Magic Link Verify Tests
  // ============================================================

  describe('POST /api/auth/magic-link/verify', () => {
    it('verifies magic link and creates new user', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      // Request magic link
      const reqRes = await request('POST', '/api/auth/magic-link/request', {
        email,
      });
      const reqData = (await reqRes.json()) as any;

      // Extract token from magic link
      const token = new URL(reqData.magicLink).searchParams.get('token');

      // Verify magic link
      const res = await request('POST', '/api/auth/magic-link/verify', {
        token,
      });

      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.message).toBe('Login successful');
      expect(data.user.email).toBe(email);
      expect(data.tokens.accessToken).toBeDefined();
      expect(data.tokens.refreshToken).toBeDefined();
      expect(data.isNewUser).toBe(true);

      if (data.user?.id) createdUserIds.push(data.user.id);
    });

    it('logs in existing user with magic link', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      // First magic link to create user
      const firstReqRes = await request(
        'POST',
        '/api/auth/magic-link/request',
        { email }
      );
      const firstReqData = (await firstReqRes.json()) as any;
      const firstToken = new URL(firstReqData.magicLink).searchParams.get(
        'token'
      );
      const firstVerifyRes = await request(
        'POST',
        '/api/auth/magic-link/verify',
        { token: firstToken }
      );
      const firstVerifyData = (await firstVerifyRes.json()) as any;
      if (firstVerifyData.user?.id)
        createdUserIds.push(firstVerifyData.user.id);

      // Second magic link for same user (returning user)
      const reqRes = await request('POST', '/api/auth/magic-link/request', {
        email,
      });
      const reqData = (await reqRes.json()) as any;
      const token = new URL(reqData.magicLink).searchParams.get('token');

      const res = await request('POST', '/api/auth/magic-link/verify', {
        token,
      });
      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.user.email).toBe(email);
      // Note: isNewUser is true if profile has no firstName (even for returning users)
      // This is intentional - users without completed profiles are treated as "new"
      expect(data.user.id).toBe(firstVerifyData.user.id); // Same user ID
    });

    it('migrates GPR session to application on verify', async () => {
      const email = uniqueEmail();
      createdSessionEmails.push(email);

      // Request magic link with GPR data
      const reqRes = await request('POST', '/api/auth/magic-link/request', {
        email,
        gprSessionData: {
          calculatorData: gprSessionData.calculatorData,
          eligibilityData: gprSessionData.eligibilityData,
        },
      });
      const reqData = (await reqRes.json()) as any;

      // Extract token
      const token = new URL(reqData.magicLink).searchParams.get('token');

      // Verify
      const res = await request('POST', '/api/auth/magic-link/verify', {
        token,
      });
      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.gprApplication).toBeDefined();
      // Compare as numbers to handle decimal formatting differences
      expect(parseFloat(data.gprApplication.totalRefund)).toBe(
        gprSessionData.calculatorData.calculationResult.totalRefund
      );

      if (data.user?.id) createdUserIds.push(data.user.id);
    });

    it('returns 400 for invalid token', async () => {
      const res = await request('POST', '/api/auth/magic-link/verify', {
        token: 'invalid-token',
      });

      const data = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid or expired magic link');
    });

    it('returns 400 for expired token', async () => {
      // Malformed token simulating expiration
      const res = await request('POST', '/api/auth/magic-link/verify', {
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoibWFnaWNfbGluayIsImV4cCI6MH0.fake',
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // Token Refresh Tests
  // ============================================================

  describe('POST /api/auth/refresh', () => {
    it('refreshes tokens with valid refresh token', async () => {
      const { refreshToken } = await createTestUserWithToken();

      const res = await request('POST', '/api/auth/refresh', {
        refreshToken,
      });

      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.message).toBe('Tokens refreshed successfully');
      expect(data.tokens.accessToken).toBeDefined();
      expect(data.tokens.refreshToken).toBeDefined();
    });

    it('returns 401 for invalid refresh token', async () => {
      const res = await request('POST', '/api/auth/refresh', {
        refreshToken: 'invalid-token',
      });

      expect(res.status).toBe(401);
    });

    it('refuses an access token as a refresh token', async () => {
      const { token } = await createTestUserWithToken();
      const res = await request('POST', '/api/auth/refresh', {
        refreshToken: token,
      });
      expect(res.status).toBe(401);
    });

    it('refuses a refresh token as a session', async () => {
      const { refreshToken } = await createTestUserWithToken();
      const res = await request('GET', '/api/auth/me', undefined, {
        Authorization: `Bearer ${refreshToken}`,
      });
      expect(res.status).toBe(401);
    });

    it('takes the role from the database, not the old token', async () => {
      const { user, refreshToken } = await createTestUserWithToken();
      await testClient`
        UPDATE shared.users SET role = 'law_firm' WHERE id = ${user.id}::uuid
      `;
      const res = await request('POST', '/api/auth/refresh', { refreshToken });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      const claims = JSON.parse(
        Buffer.from(data.tokens.accessToken.split('.')[1], 'base64url').toString()
      );
      expect(claims.role).toBe('law_firm');
    });
  });

  // ============================================================
  // Protected Route Tests (GET /me)
  // ============================================================

  describe('GET /api/auth/me', () => {
    it('returns user data with valid token', async () => {
      const { user, token } = await createTestUserWithToken();

      const res = await request('GET', '/api/auth/me', undefined, {
        Authorization: `Bearer ${token}`,
      });

      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.user.email).toBe(user.email);
    });

    it('includes the stored profile, like the sign-in responses', async () => {
      const { user, token } = await createTestUserWithToken();
      await request(
        'PUT',
        '/api/auth/profile',
        { firstName: 'Mia', lastName: 'Muster' },
        { Authorization: `Bearer ${token}` }
      );

      const res = await request('GET', '/api/auth/me', undefined, {
        Authorization: `Bearer ${token}`,
      });
      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.user).toMatchObject({
        id: user.id,
        email: user.email,
        role: 'user',
        profile: { firstName: 'Mia', lastName: 'Muster' },
      });
    });

    it('returns 401 without token', async () => {
      const res = await request('GET', '/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request('GET', '/api/auth/me', undefined, {
        Authorization: 'Bearer invalid-token',
      });

      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed authorization header', async () => {
      const res = await request('GET', '/api/auth/me', undefined, {
        Authorization: 'NotBearer token',
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // Logout Tests
  // ============================================================

  describe('POST /api/auth/logout', () => {
    it('logs out successfully with valid token', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request('POST', '/api/auth/logout', undefined, {
        Authorization: `Bearer ${token}`,
      });

      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.message).toBe('Logged out successfully');
    });

    it('ends the refresh token on the server', async () => {
      const { token, refreshToken } = await createTestUserWithToken();
      const out = await request('POST', '/api/auth/logout', undefined, {
        Authorization: `Bearer ${token}`,
      });
      expect(out.status).toBe(200);
      const res = await request('POST', '/api/auth/refresh', { refreshToken });
      expect(res.status).toBe(401);
    });

    it('returns 401 without token', async () => {
      const res = await request('POST', '/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // Profile Update Tests
  // ============================================================

  describe('PUT /api/auth/profile', () => {
    it('updates profile with valid token', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(
        'PUT',
        '/api/auth/profile',
        {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+49123456789',
        },
        { Authorization: `Bearer ${token}` }
      );

      const data = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(data.message).toBe('Profile updated successfully');
      // API returns { user: UserWithProfile } where profile is nested
      expect(data.user.profile.firstName).toBe('Updated');
      expect(data.user.profile.lastName).toBe('Name');
    });

    it('returns 401 without token', async () => {
      const res = await request('PUT', '/api/auth/profile', {
        firstName: 'Test',
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // Pre-account takeover (pre-UAT audit P0 #2)
  // ============================================================

  describe('an address registered first by someone else', () => {
    const PASSWORD = 'Attacker-Passw0rd!';

    async function attackerRegisters(email: string) {
      const res = await request('POST', '/api/auth/register', {
        email,
        password: PASSWORD,
        firstName: 'Mallory',
        lastName: 'Example',
      });
      const data = (await res.json()) as any;
      expect(res.status).toBe(201);
      createdUserIds.push(data.user.id);
      return data;
    }

    async function ownerSignsInByLink(email: string) {
      createdSessionEmails.push(email);
      const reqRes = await request('POST', '/api/auth/magic-link/request', {
        email,
      });
      const link = ((await reqRes.json()) as any).magicLink;
      const token = new URL(link).searchParams.get('token');
      const res = await request('POST', '/api/auth/magic-link/verify', {
        token,
      });
      expect(res.status).toBe(200);
      return (await res.json()) as any;
    }

    it('loses its session and password once the owner signs in by link', async () => {
      const email = uniqueEmail();
      const attacker = await attackerRegisters(email);

      // Until the owner shows up, the registrant's session works.
      let me = await request('GET', '/api/auth/me', undefined, {
        Authorization: `Bearer ${attacker.tokens.accessToken}`,
      });
      expect(me.status).toBe(200);

      const owner = await ownerSignsInByLink(email);
      expect(owner.user.id).toBe(attacker.user.id);
      expect(owner.user.emailVerified).toBe(true);

      me = await request('GET', '/api/auth/me', undefined, {
        Authorization: `Bearer ${attacker.tokens.accessToken}`,
      });
      expect(me.status).toBe(401);
      const refreshed = await request('POST', '/api/auth/refresh', {
        refreshToken: attacker.tokens.refreshToken,
      });
      expect(refreshed.status).toBe(401);
      const login = await request('POST', '/api/auth/login', {
        email,
        password: PASSWORD,
      });
      expect(login.status).toBe(401);

      // The owner's session works.
      me = await request('GET', '/api/auth/me', undefined, {
        Authorization: `Bearer ${owner.tokens.accessToken}`,
      });
      expect(me.status).toBe(200);
    });

    it('verify-email needs a signed link, not a user id', async () => {
      const email = uniqueEmail();
      const attacker = await attackerRegisters(email);
      const res = await request('POST', '/api/auth/verify-email', {
        token: attacker.user.id,
      });
      expect(res.status).toBe(400);
      const [u] = await testDb
        .select({ emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.id, attacker.user.id));
      expect(u.emailVerified).toBe(false);
    });

    it('a password never opens an admin or law-firm account', async () => {
      const email = uniqueEmail();
      const attacker = await attackerRegisters(email);
      await testDb
        .update(users)
        .set({ role: 'law_firm' })
        .where(eq(users.id, attacker.user.id));
      const login = await request('POST', '/api/auth/login', {
        email,
        password: PASSWORD,
      });
      expect(login.status).toBe(403);
    });

    it('a 2FA challenge token is not a session', async () => {
      const { createChallengeToken } = await import('../services/totp/service');
      const { user } = await createTestUserWithToken();
      const { challengeToken } = createChallengeToken({
        userId: user.id,
        email: user.email,
        emailVerified: true,
        role: 'law_firm',
      });
      const me = await request('GET', '/api/auth/me', undefined, {
        Authorization: `Bearer ${challengeToken}`,
      });
      expect(me.status).toBe(401);
    });
  });

  // ============================================================
  // Removed diagnostics
  // ============================================================

  describe('GET /api/auth/test-env', () => {
    it('is gone (it disclosed configuration to anyone)', async () => {
      const res = await request('GET', '/api/auth/test-env');
      expect(res.status).toBe(404);
    });
  });
});
