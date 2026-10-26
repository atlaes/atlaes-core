/**
 * RFC 4648 base32 (no padding on encode, padding and spaces tolerated on
 * decode). Authenticator apps expect TOTP secrets in this alphabet.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const value = ALPHABET.indexOf(ch);
    if (value < 0) throw new Error('Invalid base32 character');
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
