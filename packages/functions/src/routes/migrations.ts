import { Hono } from 'hono';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '../utils/db';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const migrations = new Hono();

// Token-gated, idempotent migration runner. Invoked by CI/CD after each
// staging deploy. Drizzle's built-in migrator tracks state in
// `drizzle.__drizzle_migrations`, so replays are safe — only pending
// migrations get applied. Token rotates via SST secret; never logged.
migrations.post('/run', async (c) => {
  const provided = c.req.header('x-admin-token');
  if (!provided || provided !== env.ADMIN_MIGRATION_TOKEN) {
    return c.json({ success: false, error: 'unauthorized' }, 401);
  }

  try {
    // In dev: src/drizzle/migrations. In production (Docker): /app/dist/migrations
    // because build.js copies migrations into dist alongside the bundled index.js.
    const migrationsFolder =
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, 'migrations')
        : path.join(process.cwd(), 'src/drizzle/migrations');

    // Auto-baseline a legacy DB (one previously managed by `drizzle-kit push:pg`,
    // which doesn't populate __drizzle_migrations). On a legacy DB, seed the
    // tracking table with hashes of all migrations that are CONSIDERED-APPLIED
    // and let the migrator pick up only the truly-new ones.
    if (await isLegacyDB()) {
      logger.info('Legacy DB detected — auto-baselining __drizzle_migrations');
      await baselineDrizzleTracking(migrationsFolder);
    }

    logger.info(`Running migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    logger.info('Migrations applied successfully');
    return c.json({ success: true });
  } catch (error) {
    logger.error('Migration run failed:', error as Record<string, unknown>);
    return c.json(
      {
        success: false,
        error: 'migration failed',
        message: error instanceof Error ? error.message : 'unknown',
      },
      500
    );
  }
});

// Detect whether the connected DB is a "legacy" one that was set up via
// `drizzle-kit push:pg` (no migration tracking) and now needs baselining.
//
// MUST return true ONLY if we are confident the schema exists from a
// historical push. MUST return false on a fresh DB so the migrator runs
// every migration from 0000 normally — getting this wrong on a fresh DB
// means we'd seed the tracking table with hashes of migrations that never
// ran, and the schema would never get created.
//
// Available signals:
//   - SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'shared')
//   - SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations')
//   - Specific table existence (e.g. shared.users, vbl.applications)
//
// TODO(user): implement this. Trade-offs to consider:
//   - Strict (e.g. require BOTH 'shared' schema AND a specific table to exist):
//     safer against false positives, but might miss a legacy DB that was
//     partially set up.
//   - Loose (e.g. only check that the tracking table is absent):
//     simpler but unsafe — a brand-new DB also has no tracking table and
//     would be misidentified as legacy.
async function isLegacyDB(): Promise<boolean> {
  // TODO(user): replace this throw with the real check. 5-10 lines.
  // Suggested shape:
  //   1. Check if drizzle.__drizzle_migrations exists. If yes → false (already tracked).
  //   2. Check if shared.users (or another canonical legacy table) exists. If no → false (fresh DB).
  //   3. Otherwise → true (legacy DB needing baseline).
  throw new Error('isLegacyDB() not implemented yet');
}

// Once isLegacyDB() returns true, this seeds drizzle.__drizzle_migrations
// with hashes for migrations 0000..0002 (everything before our new work)
// so the migrator skips them and only applies 0003+.
//
// The "boundary" is the `BASELINE_MIGRATION_TAG_PREFIX` below — every
// migration whose tag starts with a number STRICTLY LESS than this is
// marked as already applied.
const BASELINE_BOUNDARY_IDX = 3; // mark migrations 0..2 as applied; apply 3+

async function baselineDrizzleTracking(migrationsFolder: string): Promise<void> {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle;`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    );
  `);

  type JournalEntry = { idx: number; tag: string; when: number };
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
    entries: JournalEntry[];
  };

  for (const entry of journal.entries) {
    if (entry.idx >= BASELINE_BOUNDARY_IDX) continue;
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    const sqlText = fs.readFileSync(sqlPath, 'utf8');
    const hash = crypto.createHash('sha256').update(sqlText).digest('hex');
    await db.execute(sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${entry.when})
      ON CONFLICT DO NOTHING;
    `);
    logger.info(`Baselined migration ${entry.tag} as applied`);
  }
}

export default migrations;
