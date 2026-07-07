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

    // Auto-baseline migrations whose schema objects already exist but were
    // never recorded in __drizzle_migrations. This heals DBs previously (or
    // partially) managed by `drizzle-kit push:pg`, which syncs the schema
    // without populating the tracking table.
    await baselineAlreadyAppliedMigrations(migrationsFolder);

    logger.info(`Running migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    logger.info('Migrations applied successfully');
    return c.json({
      success: true,
      latestTag: readLatestJournalTag(migrationsFolder),
    });
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

// Reports which migration the running container actually has bundled, by
// reading the tag of the last entry in the SAME migrationsFolder used above.
// CI polls this after a deploy to confirm the ALB has cut over to a new
// container (old containers report an older/missing tag and get retried)
// instead of trusting a bare `success:true`, which an old container with no
// pending migrations would also return. Never fail the run over this —
// on any read error, report `null` and let CI's tag comparison keep polling.
function readLatestJournalTag(migrationsFolder: string): string | null {
  try {
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
      entries: { tag: string }[];
    };
    const lastEntry = journal.entries[journal.entries.length - 1];
    return lastEntry?.tag ?? null;
  } catch (error) {
    logger.error(
      'Failed to read latest journal tag:',
      error as Record<string, unknown>
    );
    return null;
  }
}

type QueryExecutor = {
  execute(query: unknown): Promise<unknown>;
};

// A verifiable schema object that a migration creates. Used to decide
// whether a migration's effects are already present in the DB.
export type ExistenceProbe =
  | { kind: 'table'; schema: string; table: string }
  | { kind: 'column'; schema: string; table: string; column: string }
  | { kind: 'constraint'; schema: string; table: string; constraint: string };

// Extract existence probes from drizzle-generated migration SQL. Drizzle's
// output is machine-generated and rigidly formatted, so these patterns are
// stable: CREATE TABLE [IF NOT EXISTS] "schema"."table", ALTER TABLE ...
// ADD COLUMN [IF NOT EXISTS] "col", ALTER TABLE ... ADD CONSTRAINT "name".
// Statements outside these shapes (data backfills, index changes, drops)
// yield no probes — callers must treat such migrations as unverifiable.
export function extractExistenceProbes(sqlText: string): ExistenceProbe[] {
  const probes: ExistenceProbe[] = [];

  const tableRe = /CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"\."([^"]+)"/g;
  for (const m of sqlText.matchAll(tableRe)) {
    probes.push({ kind: 'table', schema: m[1], table: m[2] });
  }

  const columnRe =
    /ALTER TABLE "([^"]+)"\."([^"]+)" ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)"/g;
  for (const m of sqlText.matchAll(columnRe)) {
    probes.push({ kind: 'column', schema: m[1], table: m[2], column: m[3] });
  }

  const constraintRe =
    /ALTER TABLE "([^"]+)"\."([^"]+)" ADD CONSTRAINT "([^"]+)"/g;
  for (const m of sqlText.matchAll(constraintRe)) {
    probes.push({
      kind: 'constraint',
      schema: m[1],
      table: m[2],
      constraint: m[3],
    });
  }

  return probes;
}

async function probeExists(
  database: QueryExecutor,
  probe: ExistenceProbe
): Promise<boolean> {
  let query;
  switch (probe.kind) {
    case 'table':
      query = sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = ${probe.schema}
            AND table_name = ${probe.table}
        ) AS exists;
      `;
      break;
    case 'column':
      query = sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = ${probe.schema}
            AND table_name = ${probe.table}
            AND column_name = ${probe.column}
        ) AS exists;
      `;
      break;
    case 'constraint':
      query = sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_schema = ${probe.schema}
            AND table_name = ${probe.table}
            AND constraint_name = ${probe.constraint}
        ) AS exists;
      `;
      break;
  }

  return readExists(await database.execute(query));
}

function readExists(result: unknown): boolean {
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === 'object' && 'rows' in result
      ? (result as { rows?: unknown[] }).rows
      : undefined;

  if (!Array.isArray(rows) || rows.length === 0) return false;

  const firstRow = rows[0];
  if (!firstRow || typeof firstRow !== 'object' || !('exists' in firstRow)) {
    return false;
  }

  return Boolean((firstRow as { exists: unknown }).exists);
}

// Seed drizzle.__drizzle_migrations with every untracked migration whose
// schema objects verifiably already exist (created by a historical
// `drizzle-kit push:pg`), so the migrator only applies the truly-new ones.
//
// Drizzle's migrator treats a migration as pending iff its journal `when`
// is greater than the newest tracked `created_at` — hashes are recorded
// but never compared. Two consequences:
//   - Only a CONTIGUOUS run of tracking rows matters, so we walk journal
//     entries in order, starting after the last tracked one, and STOP at
//     the first migration we cannot confirm as applied. Everything from
//     that point on is left for the migrator.
//   - A migration with no recognizable probes is unverifiable; stopping
//     there is the safe default (the migrator will run it).
//
// On a fresh DB the very first probe (shared.users et al.) fails, nothing
// is baselined, and the migrator runs everything from 0000 — a fresh DB
// must NEVER be baselined, or its schema would simply never get created.
async function baselineAlreadyAppliedMigrations(
  migrationsFolder: string
): Promise<void> {
  // Same DDL the drizzle migrator itself runs; harmless when present.
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle;`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    );
  `);

  const lastTracked = await db.execute(sql`
    SELECT MAX(created_at)::bigint AS last FROM drizzle.__drizzle_migrations;
  `);
  const lastTrackedMillis = readLastTracked(lastTracked);

  type JournalEntry = { idx: number; tag: string; when: number };
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
    entries: JournalEntry[];
  };

  for (const entry of journal.entries) {
    if (entry.when <= lastTrackedMillis) continue; // already tracked

    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    const sqlText = fs.readFileSync(sqlPath, 'utf8');
    const probes = extractExistenceProbes(sqlText);
    if (probes.length === 0) {
      logger.info(
        `Migration ${entry.tag} has no verifiable objects — leaving it (and all later migrations) to the migrator`
      );
      return;
    }

    for (const probe of probes) {
      if (!(await probeExists(db, probe))) {
        logger.info(
          `Migration ${entry.tag} not fully present (missing ${probe.kind}) — leaving it (and all later migrations) to the migrator`
        );
        return;
      }
    }

    const hash = crypto.createHash('sha256').update(sqlText).digest('hex');
    await db.execute(sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${entry.when});
    `);
    logger.info(`Baselined migration ${entry.tag} as already applied`);
  }
}

function readLastTracked(result: unknown): number {
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === 'object' && 'rows' in result
      ? (result as { rows?: unknown[] }).rows
      : undefined;

  const first = Array.isArray(rows) ? rows[0] : undefined;
  if (!first || typeof first !== 'object' || !('last' in first)) return 0;

  const last = (first as { last: unknown }).last;
  const parsed = typeof last === 'string' ? Number(last) : (last as number);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default migrations;
