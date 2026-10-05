import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { base32Encode } from './base32';

/**
 * TOTP per RFC 6238 on top of HOTP (RFC 4226), node crypto only.
 * Portal profile: HMAC-SHA-1, 30-second steps, 6 digits, ±1 step of
 * clock drift. The algorithm/digit parameters exist for the RFC test
 * vectors; production code uses the defaults.
 */
export type TotpAlgorithm = 'sha1' | 'sha256' | 'sha512';

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
export const TOTP_WINDOW = 1;

export interface TotpOptions {
  algorithm?: TotpAlgorithm;
  digits?: number;
  step?: number;
}

export function hotp(
  secret: Uint8Array,
  counter: number | bigint,
  { algorithm = 'sha1', digits = TOTP_DIGITS }: TotpOptions = {}
): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac(algorithm, secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

/** The time step (T in RFC 6238) for a unix time in seconds. */
export function timeStep(unixSeconds: number, step = TOTP_STEP_SECONDS): number {
  return Math.floor(unixSeconds / step);
}

export function totp(
  secret: Uint8Array,
  unixSeconds: number,
  options: TotpOptions = {}
): string {
  return hotp(secret, timeStep(unixSeconds, options.step), options);
}

function sameCode(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Checks a code against the current step ±window. Returns the matched
 * step, or null. Steps at or before `lastUsedStep` are refused so a code
 * cannot be replayed (RFC 6238 §5.2), including an older code still
 * inside the drift window once a newer one was accepted.
 */
export function verifyTotp(
  secret: Uint8Array,
  code: string,
  {
    now = Date.now() / 1000,
    window = TOTP_WINDOW,
    lastUsedStep = null,
    ...options
  }: TotpOptions & {
    now?: number;
    window?: number;
    lastUsedStep?: number | null;
  } = {}
): number | null {
  const digits = options.digits ?? TOTP_DIGITS;
  const normalized = code.replace(/\s/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) return null;
  const current = timeStep(now, options.step);
  let matched: number | null = null;
  // Check every candidate (no early exit) so timing does not reveal
  // which step matched.
  for (let delta = -window; delta <= window; delta++) {
    const step = current + delta;
    if (step < 0) continue;
    if (sameCode(hotp(secret, step, options), normalized) && matched === null) {
      matched = step;
    }
  }
  if (matched === null) return null;
  if (lastUsedStep !== null && matched <= lastUsedStep) return null;
  return matched;
}

/** 160-bit secret, the RFC 4226 recommended length for SHA-1. */
export function generateTotpSecret(): Buffer {
  return randomBytes(20);
}

/**
 * Key URI for authenticator apps
 * (https://github.com/google/google-authenticator/wiki/Key-Uri-Format).
 */
export function otpauthUri({
  issuer,
  account,
  secret,
}: {
  issuer: string;
  account: string;
  secret: Uint8Array;
}): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  // Built by hand: URLSearchParams writes spaces as '+', which some
  // authenticator apps show literally in the issuer name.
  const query = [
    `secret=${base32Encode(secret)}`,
    `issuer=${encodeURIComponent(issuer)}`,
    'algorithm=SHA1',
    `digits=${TOTP_DIGITS}`,
    `period=${TOTP_STEP_SECONDS}`,
  ].join('&');
  return `otpauth://totp/${label}?${query}`;
}

/** Groups a base32 key in blocks of four for manual entry. */
export function formatManualKey(secret: Uint8Array): string {
  return base32Encode(secret).replace(/(.{4})/g, '$1 ').trim();
}
