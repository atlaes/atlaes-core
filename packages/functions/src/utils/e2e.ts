import { createHash, timingSafeEqual } from 'crypto';
import type { Context } from 'hono';
import { env, e2eEnvSchema } from './env';
import { logger } from './logger';

/**
 * Staging-only test login for the Playwright suite (apps/vbl/e2e-staging).
 *
 * Staging runs NODE_ENV=production, so the magic link only goes out by
 * e-mail and an automated browser cannot sign in. A request counts as an
 * e2e request only when ALL of these hold:
 *   - E2E_LOGIN_SECRET is configured (>= 32 chars),
 *   - APP_STAGE is set and is not 'production' (missing stage = off),
 *   - the X-E2E-Secret header matches the secret (constant-time compare),
 *   - and, when an e-mail is involved, it ends with E2E_EMAIL_DOMAIN.
 *
 * Production is hard-off: APP_STAGE = 'production' disables every e2e path
 * even if a secret is set by mistake.
 */

/** `.test` is a reserved TLD (RFC 2606): never resolvable, never delivered. */
export const E2E_EMAIL_DOMAIN = 'e2e.test';

export const E2E_SECRET_HEADER = 'X-E2E-Secret';

const E2E_SECRET_MIN_LENGTH = 32;

export type E2eRefusal =
  | 'no_secret'
  | 'short_secret'
  | 'no_stage'
  | 'production_stage'
  | 'missing_header'
  | 'wrong_secret'
  | 'wrong_email_domain';

export interface E2eConfig {
  secret?: string;
  stage?: string;
}

/** True for addresses on the reserved e2e domain (case-insensitive). */
export function isE2eTestAddress(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${E2E_EMAIL_DOMAIN}`);
}

/**
 * Current e2e configuration. Under NODE_ENV=test this re-reads process.env
 * (same pattern as getJwtSecret) so route tests can switch it per case.
 */
export function getE2eConfig(): E2eConfig {
  if (process.env.NODE_ENV === 'test') {
    const parsed = e2eEnvSchema.safeParse({
      APP_STAGE: process.env.APP_STAGE,
      E2E_LOGIN_SECRET: process.env.E2E_LOGIN_SECRET,
    });
    if (!parsed.success) {
      // A malformed secret (too short) counts as no secret.
      return { stage: process.env.APP_STAGE || undefined };
    }
    return {
      secret: parsed.data.E2E_LOGIN_SECRET,
      stage: parsed.data.APP_STAGE,
    };
  }
  return { secret: env.E2E_LOGIN_SECRET, stage: env.APP_STAGE };
}

function secretsMatch(expected: string, provided: string): boolean {
  // Hash both sides so timingSafeEqual always gets equal-length buffers and
  // the comparison leaks neither content nor length.
  const a = createHash('sha256').update(expected, 'utf8').digest();
  const b = createHash('sha256').update(provided, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/**
 * Pure decision: null when the request is accepted, otherwise the reason it
 * is refused. Kept free of Hono so every refusal case is unit-testable.
 */
export function evaluateE2eRequest(input: {
  config: E2eConfig;
  headerSecret: string | null | undefined;
  email?: string | null;
}): E2eRefusal | null {
  const { config, headerSecret, email } = input;

  if (!config.stage) return 'no_stage';
  if (config.stage.trim().toLowerCase() === 'production') {
    return 'production_stage';
  }
  if (!config.secret) return 'no_secret';
  if (config.secret.length < E2E_SECRET_MIN_LENGTH) return 'short_secret';
  if (!headerSecret) return 'missing_header';
  if (!secretsMatch(config.secret, headerSecret)) return 'wrong_secret';
  if (email !== undefined && !isE2eTestAddress(email)) {
    return 'wrong_email_domain';
  }
  return null;
}

/**
 * True when this request carries a valid e2e secret on a non-production
 * stage (and, if `email` is passed, targets an @e2e.test address). Every
 * accepted request is logged at info level; the secret never is.
 */
export function isE2eRequest(c: Context, email?: string | null): boolean {
  const refusal = evaluateE2eRequest({
    config: getE2eConfig(),
    headerSecret: c.req.header(E2E_SECRET_HEADER),
    email,
  });
  if (refusal) return false;

  logger.info('E2E test request accepted', {
    method: c.req.method,
    path: c.req.path,
    stage: getE2eConfig().stage,
    ...(email ? { email } : {}),
  });
  return true;
}
