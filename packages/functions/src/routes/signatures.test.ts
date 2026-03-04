import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../drizzle/schema';
import { users, profiles, signatures } from '../drizzle/schema/shared';
import signaturesRouter from './signatures';
import { AuthService } from '../utils/auth';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;
let app: Hono;

const createdUserIds: string[] = [];

describe('Signatures Routes', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });

    app = new Hono();
    app.route('/api/signatures', signaturesRouter);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  afterEach(async () => {
    await cleanupTestData();
    createdUserIds.length = 0;
  });

  async function cleanupTestData() {
    try {
      for (const userId of createdUserIds) {
        await testClient`
          DELETE FROM shared.signatures WHERE user_id = ${userId}::uuid
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
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return app.fetch(req);
  }

  async function createTestUserWithToken(): Promise<{ userId: string; token: string }> {
    const email = `test-sig-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    const [user] = await testDb
      .insert(users)
      .values({
        email,
        emailVerified: true,
        authProvider: 'magic_link',
      })
      .returning();

    await testDb.insert(profiles).values({
      userId: user.id,
      firstName: 'Test',
      lastName: 'User',
    });

    createdUserIds.push(user.id);

    const token = AuthService.generateTokens({
      userId: user.id,
      email: user.email,
      emailVerified: true,
    }).accessToken;

    return { userId: user.id, token };
  }

  // ============================================================
  // Upload Signature
  // ============================================================

  describe('POST /api/signatures/upload', () => {
    it('uploads a base64 data URL signature', async () => {
      const { token } = await createTestUserWithToken();

      const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const res = await request(
        'POST',
        '/api/signatures/upload',
        { signatureData },
        { Authorization: `Bearer ${token}` }
      );

      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.signature.id).toBeDefined();
      expect(data.signature.s3Key).toContain('signatures/');
      expect(data.signature.createdAt).toBeDefined();
    });

    it('uploads raw base64 signature data', async () => {
      const { token } = await createTestUserWithToken();

      // Raw base64 without data URL prefix
      const signatureData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const res = await request(
        'POST',
        '/api/signatures/upload',
        { signatureData },
        { Authorization: `Bearer ${token}` }
      );

      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.signature.s3Key).toContain('.png'); // Falls back to png extension
    });

    it('detects image type from data URL', async () => {
      const { token } = await createTestUserWithToken();

      const signatureData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const res = await request(
        'POST',
        '/api/signatures/upload',
        { signatureData },
        { Authorization: `Bearer ${token}` }
      );

      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.signature.s3Key).toContain('.jpeg');
    });

    it('rejects empty signature data', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(
        'POST',
        '/api/signatures/upload',
        { signatureData: '' },
        { Authorization: `Bearer ${token}` }
      );

      expect(res.status).toBe(400);
    });

    it('rejects missing signature data field', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(
        'POST',
        '/api/signatures/upload',
        {},
        { Authorization: `Bearer ${token}` }
      );

      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await request('POST', '/api/signatures/upload', {
        signatureData: 'data:image/png;base64,abc123',
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // Get Signature
  // ============================================================

  describe('GET /api/signatures/:id', () => {
    it('retrieves signature by ID for owner', async () => {
      const { userId, token } = await createTestUserWithToken();

      // Create signature directly in DB
      const [sig] = await testDb
        .insert(signatures)
        .values({
          userId,
          signatureData: 'data:image/png;base64,abc',
          s3Key: `signatures/${userId}/test.png`,
          isActive: true,
        })
        .returning();

      const res = await request(
        'GET',
        `/api/signatures/${sig.id}`,
        undefined,
        { Authorization: `Bearer ${token}` }
      );

      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.signature.id).toBe(sig.id);
      // downloadUrl may be null in dev mode (no S3)
      expect(data.signature.createdAt).toBeDefined();
    });

    it('returns 404 for non-existent signature', async () => {
      const { token } = await createTestUserWithToken();
      const fakeId = crypto.randomUUID();

      const res = await request(
        'GET',
        `/api/signatures/${fakeId}`,
        undefined,
        { Authorization: `Bearer ${token}` }
      );

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
    });

    it('returns 404 when user does not own signature', async () => {
      const { userId: userId1 } = await createTestUserWithToken();
      const { token: token2 } = await createTestUserWithToken();

      // Create signature for user 1
      const [sig] = await testDb
        .insert(signatures)
        .values({
          userId: userId1,
          signatureData: 'data:image/png;base64,abc',
          isActive: true,
        })
        .returning();

      // Try to access as user 2
      const res = await request(
        'GET',
        `/api/signatures/${sig.id}`,
        undefined,
        { Authorization: `Bearer ${token2}` }
      );

      expect(res.status).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const res = await request('GET', `/api/signatures/${crypto.randomUUID()}`);

      expect(res.status).toBe(401);
    });
  });
});
