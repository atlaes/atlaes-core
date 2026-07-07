// IMPORTANT: env vars before any imports that might use them.
// Matches the pattern in src/test/setup.ts.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  'test-jwt-secret-key-for-testing-purposes-only-32-chars';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import postgres from 'postgres';
import path from 'path';
import fs from 'fs';
import migrations from './migrations';
import { env } from '../utils/env';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

// Matches the (test/dev) migrationsFolder resolution in migrations.ts, so
// the expected tag always reflects whatever migrations are actually on disk.
const MIGRATIONS_FOLDER = path.join(process.cwd(), 'src/drizzle/migrations');

function readJournalEntries(): { idx: number; tag: string; when: number }[] {
  const journalPath = path.join(MIGRATIONS_FOLDER, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
    entries: { idx: number; tag: string; when: number }[];
  };
  return journal.entries;
}

function latestJournalTag(): string {
  const entries = readJournalEntries();
  return entries[entries.length - 1].tag;
}

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
    it('returns 200 with {success:true, latestTag} when the token matches', async () => {
      const res = await postRun({ 'x-admin-token': env.ADMIN_MIGRATION_TOKEN });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        success: true,
        latestTag: latestJournalTag(),
      });
    });

    it('is idempotent — a second call also succeeds without re-applying', async () => {
      // First call may apply pending migrations or be a no-op depending on DB state;
      // either way, the second call must succeed because drizzle's migrator dedupes
      // via __drizzle_migrations.hash. If this regresses, the post-deploy curl in
      // .github/workflows/deploy-staging.yml will start failing.
      const res1 = await postRun({
        'x-admin-token': env.ADMIN_MIGRATION_TOKEN,
      });
      expect(res1.status).toBe(200);

      const res2 = await postRun({
        'x-admin-token': env.ADMIN_MIGRATION_TOKEN,
      });
      expect(res2.status).toBe(200);
      expect(await res2.json()).toEqual({
        success: true,
        latestTag: latestJournalTag(),
      });
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
      expect(await res.json()).toEqual({
        success: true,
        latestTag: latestJournalTag(),
      });

      // Confirms the migrator wrote at least one hash row — i.e. the
      // CREATE SCHEMA statements went through the IF NOT EXISTS path
      // and the migrator continued to record applied migrations.
      const rows = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations
      `;
      expect(rows[0].count).toBeGreaterThan(0);
    });
  });

  // The scenarios below reconstruct real DB states this endpoint must survive.
  // They drop and rebuild application schemas, which is destructive to local
  // data — acceptable on the disposable Docker test DB (`pnpm reset` rebuilds).

  const APP_SCHEMAS = ['drizzle', 'shared', 'vbl', 'gpr', 'claims'];

  async function dropAllSchemas() {
    for (const schema of APP_SCHEMAS) {
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  }

  async function trackedMigrationCount(): Promise<number> {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations
    `;
    return rows[0].count;
  }

  async function runMigrationsExpecting200() {
    const res = await postRun({ 'x-admin-token': env.ADMIN_MIGRATION_TOKEN });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      latestTag: latestJournalTag(),
    });
  }

  describe('fresh database (no schemas at all)', () => {
    // Regression guard: migration 0002 used to add an FK referencing
    // gpr.applications, which isn't created until 0004. On a truly-empty DB
    // the migrator died at 0002 with undefined_table (the DO-block guard only
    // swallows duplicate_object).
    beforeEach(dropAllSchemas);

    it('applies every migration from 0000 on an empty database', async () => {
      await runMigrationsExpecting200();

      // Every journal entry must be recorded as applied (none baselined —
      // nothing existed beforehand).
      expect(await trackedMigrationCount()).toBe(readJournalEntries().length);

      // The cross-schema FK (claims.claims → gpr.applications) must exist
      // even though the claims tables are created before gpr.applications.
      const fk = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM information_schema.table_constraints
        WHERE table_schema = 'claims'
          AND table_name = 'claims'
          AND constraint_name = 'claims_application_id_applications_id_fk'
      `;
      expect(fk[0].count).toBe(1);
    });
  });

  describe('legacy database (fully pushed schema, no migration tracking)', () => {
    // Regression guard: the old hardcoded baseline boundary (idx 3) only
    // marked 0000-0002 as applied, so the migrator re-ran 0005's bare
    // ADD COLUMN statements against a schema that already had the columns
    // and failed with duplicate_column.
    beforeEach(async () => {
      await dropAllSchemas();
      await runMigrationsExpecting200(); // build the full current schema
      await sql.unsafe('DROP SCHEMA "drizzle" CASCADE'); // forget tracking
    });

    it('baselines every already-applied migration and succeeds', async () => {
      await runMigrationsExpecting200();
      expect(await trackedMigrationCount()).toBe(readJournalEntries().length);
    });
  });

  describe('legacy database pushed before the newest migration existed', () => {
    // A legacy DB whose schema predates 0005: baselining must stop at the
    // first migration whose objects are missing and let the migrator apply it.
    const HEALTH_INSURANCE_COLUMNS = [
      'health_insurance_type',
      'health_insurance_provider_name',
      'health_insurance_provider_address',
      'health_insurance_insured_since_month',
      'health_insurance_insured_since_year',
      'health_insurance_place_of_birth',
      'health_insurance_country_of_birth',
      'health_insurance_number',
    ];

    beforeEach(async () => {
      await dropAllSchemas();
      await runMigrationsExpecting200();
      await sql.unsafe('DROP SCHEMA "drizzle" CASCADE');
      // Rewind claims.claims to its pre-0005 shape.
      for (const column of HEALTH_INSURANCE_COLUMNS) {
        await sql.unsafe(
          `ALTER TABLE "claims"."claims" DROP COLUMN "${column}"`
        );
      }
    });

    it('baselines up to the missing migration, then applies it', async () => {
      await runMigrationsExpecting200();
      expect(await trackedMigrationCount()).toBe(readJournalEntries().length);

      const cols = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM information_schema.columns
        WHERE table_schema = 'claims'
          AND table_name = 'claims'
          AND column_name = ANY(${HEALTH_INSURANCE_COLUMNS})
      `;
      expect(cols[0].count).toBe(HEALTH_INSURANCE_COLUMNS.length);
    });
  });

  describe('hybrid database (tracking stops early, schema fully pushed)', () => {
    // The state local dev DBs end up in: the migrator ran when only a few
    // migrations existed, then `drizzle-kit push` synced the rest of the
    // schema without recording them. Baselining must top up the tracking
    // table past the last tracked row, not only when tracking is absent.
    beforeEach(async () => {
      await dropAllSchemas();
      await runMigrationsExpecting200();
      // Forget the three newest tracking rows, keeping older ones.
      await sql.unsafe(`
        DELETE FROM drizzle.__drizzle_migrations
        WHERE created_at IN (
          SELECT created_at FROM drizzle.__drizzle_migrations
          ORDER BY created_at DESC LIMIT 3
        )
      `);
    });

    it('tops up tracking for already-applied migrations and succeeds', async () => {
      await runMigrationsExpecting200();
      expect(await trackedMigrationCount()).toBe(readJournalEntries().length);
    });
  });
});
