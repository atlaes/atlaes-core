import { defineConfig, devices } from '@playwright/test';
import { API_URL, BASE_URL } from './e2e-staging/support/env';

// Optional outbound proxy for the browser (e.g. a sandboxed runner that
// only reaches Stripe through an HTTP proxy): E2E_BROWSER_PROXY=http://user:pass@host:port
function browserProxy() {
  const raw = process.env.E2E_BROWSER_PROXY;
  if (!raw) return undefined;
  const url = new URL(raw);
  return {
    server: `${url.protocol}//${url.host}`,
    username: decodeURIComponent(url.username) || undefined,
    password: decodeURIComponent(url.password) || undefined,
    bypass: 'localhost,127.0.0.1',
  };
}

/**
 * End-to-end suite against the deployed staging stack: real backend, no
 * mocks, no local web server (the mocked specs live in e2e/).
 *
 *   pnpm -C apps/vbl test:e2e:staging                     # all projects
 *   pnpm -C apps/vbl test:e2e:staging --project calculator
 *   E2E_BASE_URL / E2E_API_URL                            # point elsewhere
 *
 * The no-login projects (calculator, eligibility) always run. The account,
 * payment and withdrawal projects need E2E_LOGIN_SECRET (the staging-only
 * test login, packages/functions/src/utils/e2e.ts) and skip without it.
 * Each test uses its own @e2e.test user and deletes it afterwards via
 * POST /api/e2e/cleanup; the global teardown sweeps leftovers. Uploads use
 * the synthetic specimens in e2e-staging/fixtures (make-specimens.mjs),
 * never real documents. Tests tagged @pending-client assert today's
 * behaviour for questions still open with the client. CI: the
 * "E2E Staging" workflow (.github/workflows/e2e-staging.yml).
 *
 * Not covered: the admin view (no admin test login exists) and the bAV
 * cash-out-basis limit warning (needs a full paid bAV journey).
 */
export default defineConfig({
  testDir: './e2e-staging',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results-staging',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-staging', open: 'never' }],
    ['json', { outputFile: 'test-results-staging/results.json' }],
  ],
  globalTeardown: './e2e-staging/global-teardown.ts',
  metadata: { baseURL: BASE_URL, apiURL: API_URL },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-GB',
    timezoneId: 'Europe/Berlin',
    proxy: browserProxy(),
  },
  projects: [
    // No login needed.
    { name: 'calculator', testMatch: 'calculator/**/*.spec.ts' },
    { name: 'eligibility', testMatch: 'eligibility/**/*.spec.ts' },
    // Need E2E_LOGIN_SECRET (staging-only test login).
    { name: 'account', testMatch: 'account/**/*.spec.ts' },
    {
      name: 'payment',
      testMatch: 'payment/**/*.spec.ts',
      // Stripe Checkout plus claim submission is slow.
      timeout: 240_000,
    },
    { name: 'withdrawal', testMatch: 'withdrawal/**/*.spec.ts' },
  ],
});
