/**
 * Where the staging suite points and how it identifies itself. Everything
 * is overridable by env so the same specs run against a local stack.
 */
export const BASE_URL = (
  process.env.E2E_BASE_URL ?? 'https://staging.vbl.atlaes.de'
).replace(/\/$/, '');

export const API_URL = (
  process.env.E2E_API_URL ?? 'https://staging.api.atlaes.de'
).replace(/\/$/, '');

/** Shared secret for the staging-only test login (header X-E2E-Secret). */
export const E2E_SECRET = process.env.E2E_LOGIN_SECRET ?? '';

export const E2E_SECRET_HEADER = 'X-E2E-Secret';

/** Reserved TLD: never deliverable, the backend refuses to mail it. */
export const E2E_EMAIL_DOMAIN = 'e2e.test';

/**
 * One id per `playwright test` invocation, shared by all workers (the
 * config module is evaluated in the runner first, which exports it).
 */
if (!process.env.E2E_RUN_ID) {
  process.env.E2E_RUN_ID = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
export const RUN_ID = process.env.E2E_RUN_ID;

export const MISSING_SECRET_MESSAGE =
  'E2E_LOGIN_SECRET is not set: skipping the login-dependent staging specs. ' +
  'Set it to the value stored in the staging environment secrets to run them.';
