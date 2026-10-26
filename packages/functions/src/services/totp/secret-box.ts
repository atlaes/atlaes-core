import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { getJwtSecret } from '../../utils/env';
import { logger } from '../../utils/logger';

/**
 * Encryption at rest for TOTP secrets and keyed hashing for recovery codes.
 *
 * Key: env TOTP_ENCRYPTION_KEY, 32 bytes as 64 hex chars or base64. Until
 * it is configured the box falls back to a key derived from JWT_SECRET
 * (HKDF) and logs a warning, so the portal keeps working on a stage that
 * has not set the secret yet. Each ciphertext names the key it was made
 * with ("env" or "jwt"), so setting the env key later does not break
 * secrets enrolled before; they keep decrypting with the fallback key.
 *
 * Ciphertext format: v1.<kid>.<iv b64url>.<tag b64url>.<data b64url>
 * (AES-256-GCM, 96-bit IV).
 */
type KeyId = 'env' | 'jwt';

let warned = false;

function parseEnvKey(raw: string): Buffer {
  const trimmed = raw.trim();
  const key = /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? Buffer.from(trimmed, 'hex')
    : Buffer.from(trimmed, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)'
    );
  }
  return key;
}

function fallbackKey(): Buffer {
  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(getJwtSecret()),
      Buffer.from('atlaes-totp'),
      Buffer.from('totp-secret-box-v1'),
      32
    )
  );
}

function keyFor(kid: KeyId): Buffer {
  if (kid === 'env') {
    const raw = process.env.TOTP_ENCRYPTION_KEY;
    if (!raw) throw new Error('TOTP_ENCRYPTION_KEY is not configured');
    return parseEnvKey(raw);
  }
  return fallbackKey();
}

function currentKeyId(): KeyId {
  if (process.env.TOTP_ENCRYPTION_KEY) return 'env';
  if (!warned) {
    warned = true;
    logger.warn(
      'TOTP_ENCRYPTION_KEY not set; TOTP secrets are encrypted with a key derived from JWT_SECRET'
    );
  }
  return 'jwt';
}

export function encryptSecret(plain: Uint8Array): string {
  const kid = currentKeyId();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(kid), iv);
  cipher.setAAD(Buffer.from(`totp:${kid}`));
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', kid, iv, tag, data]
    .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
    .join('.');
}

export function decryptSecret(box: string): Buffer {
  const [version, kid, iv, tag, data] = box.split('.');
  if (version !== 'v1' || (kid !== 'env' && kid !== 'jwt') || !data) {
    throw new Error('Unrecognised TOTP secret format');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFor(kid),
    Buffer.from(iv, 'base64url')
  );
  decipher.setAAD(Buffer.from(`totp:${kid}`));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]);
}

// ---------------- recovery codes ----------------

/** Unambiguous alphabet (no 0/O, 1/I/L). */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const RECOVERY_CODE_COUNT = 10;

/** Ten codes like "K7QM-2XHP-RT4W" (60 bits each), shown to the user once. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    let raw = '';
    for (let i = 0; i < 12; i++) {
      raw += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
    }
    return raw.replace(/(.{4})(?=.)/g, '$1-');
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * HMAC-SHA-256 keyed with a key derived from the box key: a leaked table
 * cannot be brute-forced offline without the server key, and lookups stay
 * cheap (codes have 60 bits of entropy, so no slow hash is needed).
 * Stored as "<kid>:<hex>" for the same key-rotation reason as secrets.
 */
function recoveryKey(kid: KeyId): Buffer {
  return createHash('sha256')
    .update('atlaes-totp-recovery:')
    .update(keyFor(kid))
    .digest();
}

export function hashRecoveryCode(code: string): string {
  const kid = currentKeyId();
  const mac = createHmac('sha256', recoveryKey(kid))
    .update(normalizeRecoveryCode(code))
    .digest('hex');
  return `${kid}:${mac}`;
}

export function recoveryCodeMatches(code: string, stored: string): boolean {
  const [kid, mac] = stored.split(':');
  if ((kid !== 'env' && kid !== 'jwt') || !mac) return false;
  let expected: Buffer;
  try {
    expected = createHmac('sha256', recoveryKey(kid))
      .update(normalizeRecoveryCode(code))
      .digest();
  } catch {
    return false;
  }
  const actual = Buffer.from(mac, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
