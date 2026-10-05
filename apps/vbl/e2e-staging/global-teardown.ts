import { existsSync, readFileSync, rmSync } from 'fs';
import { cleanup, EMAIL_LOG, hasE2eSecret } from './support/auth';

/**
 * Safety net after the whole run: every @e2e.test address this run created
 * is cleaned again (per-test fixtures already do it; a crashed worker may
 * not have), and leftovers of earlier crashed runs older than three hours
 * are swept. The e2e-staging workflow also calls the cleanup endpoint in an
 * `always()` step, so even a runner crash leaves nothing behind for long.
 */
export default async function globalTeardown() {
  if (!hasE2eSecret()) return;

  const emails = existsSync(EMAIL_LOG)
    ? Array.from(
        new Set(
          readFileSync(EMAIL_LOG, 'utf8')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        )
      )
    : [];

  try {
    // The endpoint takes up to 200 addresses per call.
    for (let i = 0; i < emails.length; i += 200) {
      await cleanup(emails.slice(i, i + 200));
    }
    const sweep = await cleanup([], 180);
    if (sweep && sweep.users > 0) {
      console.log(`[e2e teardown] swept ${sweep.users} stale e2e users`);
    }
    if (existsSync(EMAIL_LOG)) rmSync(EMAIL_LOG);
  } catch (error) {
    console.error('[e2e teardown] cleanup failed:', error);
  }
}
