import { Hono } from 'hono';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import { db } from '../utils/db';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const migrations = new Hono();

// Token-gated, idempotent migration runner. Invoked by CI/CD after each
// staging deploy. Drizzle's built-in migrator tracks state in
// `__drizzle_migrations`, so replays are safe — only pending migrations
// get applied. Token rotates via SST secret; never logged.
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

export default migrations;
