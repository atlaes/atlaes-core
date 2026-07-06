// IMPORTANT: env vars before any imports that might use them.
// Matches the pattern in src/test/setup.ts.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import migrations from './migrations';
import { env } from '../utils/env';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let app: Hono;
let sql: ReturnType<typeof postgres>;

async function postRun(headers: Record<string, string> = {}) {
  return app.fetch(
    new Request('http://test/api/migrations/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
    })
  );
}

describe('POST /api/migrations/run', () => {
  beforeAll(async () => {
    app = new Hono();
    app.route('/api/migrations', migrations);
    sql = postgres(TEST_DATABASE_URL, { max: 2 });
  });

  afterAll(async () => {
    await sql.end();
  });

  describe('auth gate', () => {
    it('returns 401 when no x-admin-token header is provided', async () => {
      const res = await postRun();
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        success: false,
        error: 'unauthorized',
      });
    });

    it('returns 401 when the token does not match', async () => {
      const res = await postRun({
        'x-admin-token': 'wrong-token-but-still-32-chars-long-x',
      });
      expect(res.status).toBe(401);
    });

    it('rejects an empty x-admin-token header', async () => {
      const res = await postRun({ 'x-admin-token': '' });
      expect(res.status).toBe(401);
    });
  });

  describe('happy path', () => {
    it('returns 200 with {success:true} when the token matches', async () => {
      const res = await postRun({ 'x-admin-token': env.ADMIN_MIGRATION_TOKEN });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('is idempotent — a second call also succeeds without re-applying', async () => {
      // First call may apply pending migrations or be a no-op depending on DB state;
      // either way, the second call must succeed because drizzle's migrator dedupes
      // via __drizzle_migrations.hash. If this regresses, the post-deploy curl in
      // .github/workflows/deploy-staging.yml will start failing.
      const res1 = await postRun({ 'x-admin-token': env.ADMIN_MIGRATION_TOKEN });
      expect(res1.status).toBe(200);

      const res2 = await postRun({ 'x-admin-token': env.ADMIN_MIGRATION_TOKEN });
      expect(res2.status).toBe(200);
      expect(await res2.json()).toEqual({ success: true });
    });
  });

  describe('regression guard: PR #18 (CREATE SCHEMA IF NOT EXISTS)', () => {
    // Simulates the staging bootstrap state that previously caused 500s:
    // schemas exist (created out-of-band by `drizzle-kit push:pg`) but
    // drizzle.__drizzle_migrations is empty, so the migrator retries from
    // migration 0. If any 0000-0002 reverts to a bare `CREATE SCHEMA`,
    // this test fails with a 500 before the auth gate could mask it.
    beforeEach(async () => {
      await sql.unsafe('DROP SCHEMA IF EXISTS "drizzle" CASCADE');
      await sql.unsafe('CREATE SCHEMA IF NOT EXISTS "shared"');
      await sql.unsafe('CREATE SCHEMA IF NOT EXISTS "vbl"');
      await sql.unsafe('CREATE SCHEMA IF NOT EXISTS "gpr"');
      await sql.unsafe('CREATE SCHEMA IF NOT EXISTS "claims"');
    });

    it('survives a fresh migrator run when schemas already exist', async () => {
      const res = await postRun({ 'x-admin-token': env.ADMIN_MIGRATION_TOKEN });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      // Confirms the migrator wrote at least one hash row — i.e. the
      // CREATE SCHEMA statements went through the IF NOT EXISTS path
      // and the migrator continued to record applied migrations.
      const rows = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations
      `;
      expect(rows[0].count).toBeGreaterThan(0);
    });
  });
});
