import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../drizzle/schema/shared';
import integrationsAdmin from './integrations-admin';
import { AuthService } from '../utils/auth';
import {
  clearPayoutAccountCache,
  PayoutAccountsService,
} from '../services/payout-accounts';
import {
  atlaesAccount,
  collectionAccount,
} from '../services/payout-queue/config';

// Admin-managed payout accounts against a real database (migration 0027).
// IBANs are the standard published example IBANs, not real accounts.
//   pnpm vitest run src/routes/payout-accounts-admin.test.ts
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

const EXAMPLE_DE = 'DE89370400440532013000';
const EXAMPLE_GB = 'GB82WEST12345698765432';

let testClient: ReturnType<typeof postgres>;
let app: Hono;
const stamp = Date.now();
const userIds: string[] = [];

async function makeUser(role: string, tag: string) {
  const [user] = await drizzle(testClient)
    .insert(users)
    .values({
      email: `test-payout-accounts-${tag}-${stamp}@example.com`,
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

describe('admin payout accounts', () => {
  let adminToken: string;
  let userToken: string;
  const envBefore = process.env.ATLAES_IBAN;

  beforeAll(async () => {
    testClient = postgres(TEST_DATABASE_URL);
    app = new Hono();
    app.route('/api/admin/integrations', integrationsAdmin);
    adminToken = await makeUser('admin', 'admin');
    userToken = await makeUser('user', 'user');
    delete process.env.ATLAES_IBAN;
    await testClient`DELETE FROM shared.payout_accounts`;
    clearPayoutAccountCache();
  });

  afterAll(async () => {
    if (envBefore === undefined) delete process.env.ATLAES_IBAN;
    else process.env.ATLAES_IBAN = envBefore;
    try {
      await testClient`DELETE FROM shared.payout_accounts`;
      for (const id of userIds) {
        await testClient`DELETE FROM shared.audit_logs WHERE user_id = ${id}::uuid`;
        await testClient`DELETE FROM shared.users WHERE id = ${id}::uuid`;
      }
    } finally {
      await testClient.end();
      clearPayoutAccountCache();
    }
  });

  it('is admin-only', async () => {
    expect((await call('GET', '/payout-accounts', null)).status).toBe(401);
    expect((await call('GET', '/payout-accounts', userToken)).status).toBe(403);
    expect(
      (
        await call('PUT', '/payout-accounts/atlaes', userToken, {
          holder: 'X',
          iban: EXAMPLE_DE,
        })
      ).status
    ).toBe(403);
  });

  it('lists every account as not set at first', async () => {
    const res = await call('GET', '/payout-accounts', adminToken);
    const body = await res.json();
    expect(body.accounts.map((a: { key: string }) => a.key)).toEqual([
      'atlaes',
      'summitfx_collection',
      'wise_collection',
    ]);
    expect(
      body.accounts.every((a: { account: unknown }) => a.account === null)
    ).toBe(true);
    expect((await atlaesAccount()).iban).toBeNull();
  });

  it('rejects an invalid IBAN or BIC and unknown keys', async () => {
    const bad = await call('PUT', '/payout-accounts/atlaes', adminToken, {
      holder: 'ATLAES GmbH',
      iban: 'DE00370400440532013000',
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ field: 'iban' });
    const badBic = await call('PUT', '/payout-accounts/atlaes', adminToken, {
      holder: 'ATLAES GmbH',
      iban: EXAMPLE_DE,
      bic: 'NOPE',
    });
    expect((await badBic.json()).field).toBe('bic');
    expect(
      (await call('PUT', '/payout-accounts/other', adminToken, {})).status
    ).toBe(404);
  });

  it('saves the ATLAES account, audits only the IBAN tail, and payouts use it', async () => {
    const res = await call('PUT', '/payout-accounts/atlaes', adminToken, {
      holder: ' ATLAES GmbH ',
      iban: EXAMPLE_DE.toLowerCase(),
      bank: 'Example Bank',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).account).toMatchObject({
      key: 'atlaes',
      source: 'admin',
      holder: 'ATLAES GmbH',
      iban: 'DE89 3704 0044 0532 0130 00',
      bank: 'Example Bank',
    });
    const audit =
      await testClient`SELECT details FROM shared.audit_logs WHERE action = 'payout_account_set' AND user_id = ANY(${userIds}::uuid[])`;
    expect(audit.length).toBe(1);
    expect(JSON.stringify(audit[0].details)).not.toContain('0532013000');
    expect(JSON.stringify(audit[0].details)).toContain('…3000');

    expect(await atlaesAccount()).toMatchObject({
      holder: 'ATLAES GmbH',
      iban: 'DE89 3704 0044 0532 0130 00',
    });
  });

  it('the admin account wins over the legacy env value', async () => {
    process.env.ATLAES_IBAN = EXAMPLE_GB;
    clearPayoutAccountCache();
    expect((await PayoutAccountsService.get('atlaes'))?.source).toBe('admin');
  });

  it('collection accounts feed route B lines', async () => {
    expect(await collectionAccount('summitfx_collection')).toBeNull();
    await call('PUT', '/payout-accounts/summitfx_collection', adminToken, {
      holder: 'Example Collection',
      iban: EXAMPLE_GB,
      reference: 'REF-1',
    });
    expect(await collectionAccount('summitfx_collection')).toEqual({
      holder: 'Example Collection',
      iban: 'GB82 WEST 1234 5698 7654 32',
      bic: null,
      bank: null,
      reference: 'REF-1',
    });
  });
});
