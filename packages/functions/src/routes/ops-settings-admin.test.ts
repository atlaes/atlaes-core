import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../drizzle/schema/shared';
import integrationsAdmin from './integrations-admin';
import { AuthService } from '../utils/auth';
import {
  DEFAULT_POSTAL_AGENT,
  OpsSettingsService,
  clearOpsSettingsCache,
  postalAgentLines,
} from '../services/ops-settings';

// Admin-managed ops settings against a real database (migration 0031).
//   pnpm vitest run src/routes/ops-settings-admin.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let app: Hono;
const stamp = Date.now();
const userIds: string[] = [];

async function makeUser(role: string, tag: string) {
  const [user] = await drizzle(testClient)
    .insert(users)
    .values({
      email: `test-ops-settings-${tag}-${stamp}@example.com`,
      emailVerified: true,
      authProvider: 'magic_link',
      role,
    })
    .returning();
  userIds.push(user.id);
  return AuthService.generateTokens({
    userId: user.id,
    email: user.email,
    emailVerified: true,
    role,
  }).accessToken;
}

const call = (
  method: string,
  path: string,
  token: string | null,
  body?: unknown
) =>
  app.request(`/api/admin/integrations${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('admin ops settings', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    testClient = postgres(TEST_DATABASE_URL);
    app = new Hono();
    app.route('/api/admin/integrations', integrationsAdmin);
    adminToken = await makeUser('admin', 'admin');
    userToken = await makeUser('user', 'user');
    await testClient`DELETE FROM shared.ops_settings`;
    clearOpsSettingsCache();
  });

  afterAll(async () => {
    try {
      await testClient`DELETE FROM shared.ops_settings`;
      for (const id of userIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE user_id = ${id}::uuid`;
        await testClient`DELETE FROM shared.users WHERE id = ${id}::uuid`;
      }
    } finally {
      await testClient.end();
      clearOpsSettingsCache();
    }
  });

  it('is admin-only', async () => {
    expect((await call('GET', '/ops-settings', null)).status).toBe(401);
    expect((await call('GET', '/ops-settings', userToken)).status).toBe(403);
    expect(
      (await call('PUT', '/ops-settings/postal_agent', userToken, {})).status
    ).toBe(403);
  });

  it('falls back to the owner-supplied postal agent', async () => {
    const body = await (await call('GET', '/ops-settings', adminToken)).json();
    expect(body.settings.map((s: { key: string }) => s.key)).toEqual([
      'postal_agent',
      'direct_dispatch_operator',
    ]);
    expect(body.settings[0]).toMatchObject({
      source: 'default',
      value: DEFAULT_POSTAL_AGENT,
    });
    expect(postalAgentLines(await OpsSettingsService.postalAgent())).toEqual([
      'Anna Kliem',
      'Kaskelstr. 46',
      '10317 Berlin',
    ]);
    expect(await OpsSettingsService.dispatchOperator()).toBeNull();
  });

  it('validates, saves and audits a change', async () => {
    const bad = await call('PUT', '/ops-settings/postal_agent', adminToken, {
      name: 'Anna Kliem',
      street: '',
      postalCode: '10317',
      city: 'Berlin',
    });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('Enter the street');

    const res = await call('PUT', '/ops-settings/postal_agent', adminToken, {
      name: ' Anna  Kliem ',
      coLine: 'c/o Example GmbH',
      street: 'Kaskelstr. 46',
      postalCode: '10317',
      city: 'Berlin',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).setting).toMatchObject({
      source: 'admin',
      value: { name: 'Anna Kliem', coLine: 'c/o Example GmbH' },
    });
    expect(postalAgentLines(await OpsSettingsService.postalAgent())).toEqual([
      'Anna Kliem',
      'c/o Example GmbH',
      'Kaskelstr. 46',
      '10317 Berlin',
    ]);

    await call('PUT', '/ops-settings/direct_dispatch_operator', adminToken, {
      name: 'ATLAES Ops',
    });
    expect(await OpsSettingsService.dispatchOperator()).toEqual({
      name: 'ATLAES Ops',
    });

    const audit =
      await testClient`SELECT details FROM shared.audit_logs WHERE action = 'ops_setting_updated' AND user_id = ANY(${userIds}::uuid[])`;
    expect(audit.length).toBe(2);
    expect(
      (await call('PUT', '/ops-settings/unknown', adminToken, {})).status
    ).toBe(404);
  });
});
