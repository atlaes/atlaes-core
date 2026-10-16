import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { users } from '../drizzle/schema/shared';
import { drizzle } from 'drizzle-orm/postgres-js';
import integrationsAdmin from './integrations-admin';
import { AuthService } from '../utils/auth';
import {
  clearIntegrationCache,
  resolveLexofficeKey,
} from '../services/integration-settings';

// Admin-managed Lexware key against a real database (migration 0024).
// Lexware itself is stubbed: fetch answers GET /v1/profile.
//   pnpm vitest run src/routes/integrations-admin.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

const GOOD_KEY = 'lx-test-key-0000000000000000-GOOD';
const BAD_KEY = 'lx-test-key-0000000000000000-BADX';

let testClient: ReturnType<typeof postgres>;
let app: Hono;
const stamp = Date.now();
const userIds: string[] = [];

async function makeUser(role: string, tag: string) {
  const testDb = drizzle(testClient);
  const [user] = await testDb
    .insert(users)
    .values({
      email: `test-integrations-${tag}-${stamp}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role,
    })
    .returning();
  userIds.push(user.id);
  const token = AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: true,
    role,
  }).accessToken;
  return { user, token };
}

function stubLexware() {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(String(url));
      const auth = new Headers(init?.headers).get('Authorization');
      if (auth === `Bearer ${GOOD_KEY}`) {
        return new Response(
          JSON.stringify({
            organizationId: 'org-1',
            companyName: 'ATLAES GmbH',
            subscriptionStatus: 'active',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{"message":"Unauthorized"}', { status: 401 });
    })
  );
  return calls;
}

const call = (
  method: string,
  token: string | null,
  body?: unknown,
  path = '/api/admin/integrations/lexoffice'
) =>
  app.request(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('admin integrations: Lexware key', () => {
  let adminToken: string;
  let userToken: string;
  const envBefore = process.env.LEXOFFICE_API_KEY;

  beforeAll(async () => {
    testClient = postgres(TEST_DATABASE_URL);
    app = new Hono();
    app.route('/api/admin/integrations', integrationsAdmin);
    adminToken = (await makeUser('admin', 'admin')).token;
    userToken = (await makeUser('user', 'user')).token;
    delete process.env.LEXOFFICE_API_KEY;
    await testClient`DELETE FROM shared.integration_settings WHERE key = 'lexoffice'`;
    clearIntegrationCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    if (envBefore === undefined) delete process.env.LEXOFFICE_API_KEY;
    else process.env.LEXOFFICE_API_KEY = envBefore;
    try {
      await testClient`DELETE FROM shared.integration_settings WHERE key = 'lexoffice'`;
      for (const id of userIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE user_id = ${id}::uuid`;
        await testClient`DELETE FROM shared.users WHERE id = ${id}::uuid`;
      }
    } finally {
      await testClient.end();
      clearIntegrationCache();
    }
  });

  it('is admin-only', async () => {
    expect((await call('GET', null)).status).toBe(401);
    expect((await call('GET', userToken)).status).toBe(403);
    expect((await call('PUT', userToken, { apiKey: GOOD_KEY })).status).toBe(
      403
    );
  });

  it('reports no key configured', async () => {
    const res = await call('GET', adminToken);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ source: 'none', last4: null });
  });

  it('refuses a key Lexware rejects and stores nothing', async () => {
    stubLexware();
    const res = await call('PUT', adminToken, { apiKey: BAD_KEY });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/rejected/);
    const rows =
      await testClient`SELECT 1 FROM shared.integration_settings WHERE key = 'lexoffice'`;
    expect(rows.length).toBe(0);
  });

  it('rejects input that is not a key', async () => {
    expect((await call('PUT', adminToken, {})).status).toBe(400);
    expect((await call('PUT', adminToken, { apiKey: 'short' })).status).toBe(
      400
    );
  });

  it('checks, seals and stores a good key without ever returning it', async () => {
    const calls = stubLexware();
    const res = await call('PUT', adminToken, { apiKey: ` ${GOOD_KEY} ` });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(GOOD_KEY);
    expect(JSON.parse(text)).toMatchObject({
      source: 'admin',
      last4: 'GOOD',
      companyName: 'ATLAES GmbH',
      baseUrl: 'https://api.lexware.io/v1',
    });
    expect(calls).toEqual(['https://api.lexware.io/v1/profile']);

    const [row] =
      await testClient`SELECT secret_encrypted, last4 FROM shared.integration_settings WHERE key = 'lexoffice'`;
    expect(row.secret_encrypted).toMatch(/^v1\./);
    expect(row.secret_encrypted).not.toContain(GOOD_KEY);

    const audit =
      await testClient`SELECT details FROM shared.audit_logs WHERE action = 'integration_key_set' AND user_id = ANY(${userIds}::uuid[])`;
    expect(audit.length).toBe(1);
    expect(JSON.stringify(audit[0].details)).not.toContain(GOOD_KEY);

    expect(await resolveLexofficeKey()).toEqual({
      key: GOOD_KEY,
      source: 'admin',
    });
  });

  it('a stored key wins over the env secret', async () => {
    process.env.LEXOFFICE_API_KEY = 'env-key-000000000000000000-ENVK';
    clearIntegrationCache();
    expect((await resolveLexofficeKey()).source).toBe('admin');
  });

  it('test endpoint checks the active key', async () => {
    stubLexware();
    const res = await call(
      'POST',
      adminToken,
      undefined,
      '/api/admin/integrations/lexoffice/test'
    );
    expect(await res.json()).toMatchObject({
      ok: true,
      source: 'admin',
      companyName: 'ATLAES GmbH',
    });
  });

  it('removing the key falls back to the env secret', async () => {
    const res = await call('DELETE', adminToken);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ source: 'env', last4: 'ENVK' });
    expect((await resolveLexofficeKey()).source).toBe('env');
  });
});
