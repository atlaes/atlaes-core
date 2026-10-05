import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const SECRET = 'test-jwt-secret-at-least-32-characters-long';
vi.mock('../../utils/env', () => ({ getJwtSecret: () => SECRET }));
vi.mock('../../utils/logger', () => ({ logger: { warn: () => {}, error: () => {} } }));
vi.mock('../../utils/db', () => ({ db: {} }));
vi.mock('../../utils/auth', () => ({ AuthService: {} }));
vi.mock('../../drizzle/schema/shared', () => ({ auditLogs: {}, users: {} }));
vi.mock('../../drizzle/schema/two-factor', () => ({ userTotp: {}, lawFirmIpAllowlist: {} }));

const {
  createChallengeToken,
  verifyChallengeToken,
  isMfaFresh,
  PORTAL_MFA_MAX_AGE_SECONDS,
  TwoFactorError,
} = await import('./service');

const subject = {
  userId: '7b0c4a52-0d2f-4bb4-9a51-1f8e8f3f6c11',
  email: 'user@vividius.de',
  emailVerified: true,
  role: 'law_firm',
};

describe('2FA challenge token', () => {
  it('round-trips the subject', () => {
    const { challengeToken, challengeExpiresAt } = createChallengeToken(subject);
    expect(verifyChallengeToken(challengeToken)).toEqual(subject);
    expect(new Date(challengeExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('is not an access token and an access token is not a challenge', () => {
    const access = jwt.sign({ ...subject }, SECRET);
    expect(() => verifyChallengeToken(access)).toThrow(TwoFactorError);
    const magic = jwt.sign({ email: subject.email, type: 'magic_link' }, SECRET);
    expect(() => verifyChallengeToken(magic)).toThrow(TwoFactorError);
  });

  it('rejects expired or foreign-signed challenges', () => {
    const expired = jwt.sign({ ...subject, type: '2fa_challenge' }, SECRET, { expiresIn: -1 });
    expect(() => verifyChallengeToken(expired)).toThrow(/expired/);
    const foreign = jwt.sign({ ...subject, type: '2fa_challenge' }, 'another-secret-another-secret-123');
    expect(() => verifyChallengeToken(foreign)).toThrow(TwoFactorError);
  });
});

describe('portal session freshness (mfa claim)', () => {
  const now = 1_800_000_000;
  it('requires a numeric mfa claim', () => {
    expect(isMfaFresh(null, now)).toBe(false);
    expect(isMfaFresh({ userId: 'x' }, now)).toBe(false);
    expect(isMfaFresh({ mfa: 'yes' }, now)).toBe(false);
  });
  it('accepts a recent second factor and expires it after the max age', () => {
    expect(isMfaFresh({ mfa: now - 60 }, now)).toBe(true);
    expect(isMfaFresh({ mfa: now - PORTAL_MFA_MAX_AGE_SECONDS }, now)).toBe(true);
    expect(isMfaFresh({ mfa: now - PORTAL_MFA_MAX_AGE_SECONDS - 1 }, now)).toBe(false);
    expect(isMfaFresh({ mfa: now + 3600 }, now)).toBe(false);
  });
});
