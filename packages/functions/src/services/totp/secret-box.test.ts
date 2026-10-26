import { afterEach, describe, expect, it, vi } from 'vitest';

// Pure test: no env/zod parsing, no logger transport.
vi.mock('../../utils/env', () => ({
  getJwtSecret: () => 'test-jwt-secret-at-least-32-characters-long',
}));
vi.mock('../../utils/logger', () => ({ logger: { warn: () => {} } }));
import { randomBytes } from 'node:crypto';
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  recoveryCodeMatches,
} from './secret-box';

const KEY = randomBytes(32).toString('hex');

afterEach(() => {
  delete process.env.TOTP_ENCRYPTION_KEY;
});

describe('secret box', () => {
  it('round-trips with TOTP_ENCRYPTION_KEY and does not store plaintext', () => {
    process.env.TOTP_ENCRYPTION_KEY = KEY;
    const secret = randomBytes(20);
    const box = encryptSecret(secret);
    expect(box.startsWith('v1.env.')).toBe(true);
    expect(box).not.toContain(secret.toString('base64url'));
    expect(decryptSecret(box).equals(secret)).toBe(true);
  });

  it('uses a fresh IV per encryption', () => {
    process.env.TOTP_ENCRYPTION_KEY = KEY;
    const secret = randomBytes(20);
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it('rejects tampered ciphertext', () => {
    process.env.TOTP_ENCRYPTION_KEY = KEY;
    const parts = encryptSecret(randomBytes(20)).split('.');
    const data = Buffer.from(parts[4], 'base64url');
    data[0] ^= 1;
    parts[4] = data.toString('base64url');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });

  it('falls back to the JWT-derived key and keeps decrypting after the env key is set', () => {
    const secret = randomBytes(20);
    const box = encryptSecret(secret);
    expect(box.startsWith('v1.jwt.')).toBe(true);
    process.env.TOTP_ENCRYPTION_KEY = KEY;
    expect(decryptSecret(box).equals(secret)).toBe(true);
  });

  it('accepts a base64 key and refuses a short one', () => {
    process.env.TOTP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    expect(() => encryptSecret(randomBytes(20))).not.toThrow();
    process.env.TOTP_ENCRYPTION_KEY = 'abc';
    expect(() => encryptSecret(randomBytes(20))).toThrow(/32 bytes/);
  });
});

describe('recovery codes', () => {
  it('generates ten distinct XXXX-XXXX-XXXX codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('stores only a keyed hash and matches regardless of case/dashes', () => {
    process.env.TOTP_ENCRYPTION_KEY = KEY;
    const [code] = generateRecoveryCodes(1);
    const stored = hashRecoveryCode(code);
    expect(stored).toMatch(/^env:[0-9a-f]{64}$/);
    expect(stored).not.toContain(code.replace(/-/g, ''));
    expect(recoveryCodeMatches(code.toLowerCase().replace(/-/g, ' '), stored)).toBe(true);
    expect(recoveryCodeMatches('AAAA-BBBB-CCCC', stored)).toBe(false);
  });
});
