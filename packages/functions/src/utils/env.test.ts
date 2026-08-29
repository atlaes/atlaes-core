import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Regression tests for the module-init contract of `utils/env`.
 *
 * `env.ts` is imported transitively by every Lambda entrypoint
 * (stripe-webhook -> PaymentService -> utils/db -> utils/env), so anything it
 * does at module scope runs before any handler. Two production faults came
 * from that, both of which silently broke the staging Stripe webhook:
 *
 *  1. The ADMIN_MIGRATION_TOKEN production guard threw at import time. The
 *     Lambda runs with NODE_ENV=production but is not linked to that secret,
 *     so the function died during init on every invocation.
 *  2. getDatabaseUrl() only read `SST_RESOURCE_AtlaesDatabase`. SST injects
 *     links that way for `sst.aws.Service` (Fargate) but encrypts them into a
 *     `resource.enc` bundle for `sst.aws.Function` (Lambda), so the Lambda
 *     silently fell back to localhost and could never reach RDS.
 *
 * These run in a child process rather than via `vi.resetModules()`: this suite
 * is configured with `isolate: false`, so resetting the shared module registry
 * mid-run intermittently breaks unrelated files. A subprocess is also a more
 * faithful reproduction — it exercises a real cold start.
 */

const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const TSX_BIN = path.join(PACKAGE_ROOT, 'node_modules/.bin/tsx');

const DB_LINK = {
  username: 'linkuser',
  password: 'linkpass',
  host: 'db.internal.example.com',
  port: 5432,
  database: 'linkdb',
};

const EXPECTED_LINK_URL =
  'postgresql://linkuser:linkpass@db.internal.example.com:5432/linkdb';

// A DATABASE_URL that must lose to a real SST link, proving the link wins.
const DECOY_DATABASE_URL = 'postgresql://decoy:decoy@localhost:5432/decoy';

const tempDirs: string[] = [];

/**
 * Reproduce SST's runtime encryption for linked resources: aes-256-gcm with a
 * 12-byte zero nonce, ciphertext followed by the 16-byte auth tag. Mirrors
 * node_modules/sst/dist/resource.js.
 */
function writeEncryptedResourceFile(payload: Record<string, unknown>): {
  keyFile: string;
  keyBase64: string;
} {
  const key = crypto.randomBytes(32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, Buffer.alloc(12, 0));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload)),
    cipher.final(),
  ]);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sst-link-'));
  tempDirs.push(dir);
  const keyFile = path.join(dir, 'resource.enc');
  fs.writeFileSync(keyFile, Buffer.concat([ciphertext, cipher.getAuthTag()]));

  return { keyFile, keyBase64: key.toString('base64') };
}

/**
 * Import `utils/env` in a fresh Node process under the given environment.
 * Returns whether init succeeded plus the child's stdout.
 */
function importEnv(
  overrides: Record<string, string | undefined>,
  { callGuard = false } = {}
): { ok: boolean; output: string } {
  const script = `
    import('./src/utils/env.ts')
      .then((m) => {
        const mod = m.default ?? m;
        ${callGuard ? 'mod.assertMigrationTokenConfigured();' : ''}
        console.log('INIT_OK ' + mod.env.DATABASE_URL);
      })
      .catch((err) => {
        console.log('INIT_THREW ' + err.message);
        process.exit(1);
      });
  `;

  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  // Start from a clean slate so the parent's test-mode vars never leak in.
  for (const key of [
    'ADMIN_MIGRATION_TOKEN',
    'SST_KEY',
    'SST_KEY_FILE',
    'SST_RESOURCE_App',
    'SST_RESOURCE_AtlaesDatabase',
  ]) {
    delete childEnv[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete childEnv[key];
    else childEnv[key] = value;
  }

  try {
    const stdout = execFileSync(TSX_BIN, ['-e', script], {
      cwd: PACKAGE_ROOT,
      env: childEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: stdout };
  } catch (error) {
    const err = error as { stdout?: string; message: string };
    return { ok: false, output: err.stdout ?? err.message };
  }
}

describe('utils/env module initialization', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('imports cleanly in production without ADMIN_MIGRATION_TOKEN', () => {
    // The Stripe webhook Lambda's exact situation: NODE_ENV=production, and no
    // AdminMigrationToken link — only the backend serves /api/migrations/run.
    const result = importEnv({ NODE_ENV: 'production' });

    expect(result.output).toContain('INIT_OK');
    expect(result.ok).toBe(true);
  });

  it('resolves DATABASE_URL from an encrypted resource file (Lambda link)', () => {
    const { keyFile, keyBase64 } = writeEncryptedResourceFile({
      AtlaesDatabase: DB_LINK,
    });

    // A Lambda gets no SST_RESOURCE_<name> variable at all — only the key and
    // a pointer to the encrypted bundle.
    const result = importEnv({
      NODE_ENV: 'production',
      DATABASE_URL: DECOY_DATABASE_URL,
      SST_RESOURCE_App: JSON.stringify({ name: 'atlaes', stage: 'test' }),
      SST_KEY: keyBase64,
      SST_KEY_FILE: keyFile,
    });

    expect(result.output).toContain(`INIT_OK ${EXPECTED_LINK_URL}`);
  });

  it('resolves DATABASE_URL from an SST_RESOURCE_* env var (Fargate link)', () => {
    const result = importEnv({
      NODE_ENV: 'production',
      DATABASE_URL: DECOY_DATABASE_URL,
      SST_RESOURCE_App: JSON.stringify({ name: 'atlaes', stage: 'test' }),
      SST_RESOURCE_AtlaesDatabase: JSON.stringify(DB_LINK),
    });

    expect(result.output).toContain(`INIT_OK ${EXPECTED_LINK_URL}`);
  });

  it('falls back to DATABASE_URL when no SST link is present', () => {
    const result = importEnv({
      NODE_ENV: 'production',
      DATABASE_URL: DECOY_DATABASE_URL,
    });

    expect(result.output).toContain(`INIT_OK ${DECOY_DATABASE_URL}`);
  });

  it('still refuses to start the backend on the dev migration token', () => {
    // The guard moved out of module scope, but the backend entrypoint calls it
    // explicitly — that protection must survive.
    const result = importEnv({ NODE_ENV: 'production' }, { callGuard: true });

    expect(result.ok).toBe(false);
    expect(result.output).toContain('INIT_THREW');
    expect(result.output).toContain('ADMIN_MIGRATION_TOKEN must be set');
  });

  it('starts the backend when a real migration token is configured', () => {
    const result = importEnv(
      {
        NODE_ENV: 'production',
        ADMIN_MIGRATION_TOKEN: 'a'.repeat(40),
      },
      { callGuard: true }
    );

    expect(result.output).toContain('INIT_OK');
    expect(result.ok).toBe(true);
  });
});
