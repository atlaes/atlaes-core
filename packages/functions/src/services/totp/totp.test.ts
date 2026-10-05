import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode } from './base32';
import {
  formatManualKey,
  hotp,
  otpauthUri,
  totp,
  verifyTotp,
  type TotpAlgorithm,
} from './totp';

const SEED_SHA1 = Buffer.from('12345678901234567890');
const SEED_SHA256 = Buffer.from('12345678901234567890123456789012');
const SEED_SHA512 = Buffer.from(
  '1234567890123456789012345678901234567890123456789012345678901234'
);

describe('HOTP (RFC 4226 Appendix D)', () => {
  const expected = [
    '755224', '287082', '359152', '969429', '338314',
    '254676', '287922', '162583', '399871', '520489',
  ];
  expected.forEach((code, counter) => {
    it(`counter ${counter} → ${code}`, () => {
      expect(hotp(SEED_SHA1, counter)).toBe(code);
    });
  });
});

describe('TOTP (RFC 6238 Appendix B)', () => {
  const vectors: [number, string, TotpAlgorithm, Buffer][] = [];
  const table: [number, string, string, string][] = [
    [59, '94287082', '46119246', '90693936'],
    [1111111109, '07081804', '68084774', '25091201'],
    [1111111111, '14050471', '67062674', '99943326'],
    [1234567890, '89005924', '91819424', '93441116'],
    [2000000000, '69279037', '90698825', '38618901'],
    [20000000000, '65353130', '77737706', '47863826'],
  ];
  for (const [time, sha1, sha256, sha512] of table) {
    vectors.push([time, sha1, 'sha1', SEED_SHA1]);
    vectors.push([time, sha256, 'sha256', SEED_SHA256]);
    vectors.push([time, sha512, 'sha512', SEED_SHA512]);
  }
  it.each(vectors)('T=%i → %s (%s)', (time, code, algorithm, seed) => {
    expect(totp(seed, time, { algorithm, digits: 8 })).toBe(code);
  });

  it('portal profile is the 6-digit tail of the SHA-1 vector', () => {
    expect(totp(SEED_SHA1, 59)).toBe('287082');
    expect(totp(SEED_SHA1, 1111111109)).toBe('081804');
  });
});

describe('verifyTotp', () => {
  const now = 1111111111; // step 37037037
  const step = Math.floor(now / 30);

  it('accepts the current step and returns it', () => {
    expect(verifyTotp(SEED_SHA1, totp(SEED_SHA1, now), { now })).toBe(step);
  });

  it('accepts ±1 step of drift, not ±2', () => {
    expect(verifyTotp(SEED_SHA1, totp(SEED_SHA1, now - 30), { now })).toBe(step - 1);
    expect(verifyTotp(SEED_SHA1, totp(SEED_SHA1, now + 30), { now })).toBe(step + 1);
    expect(verifyTotp(SEED_SHA1, totp(SEED_SHA1, now - 60), { now })).toBeNull();
    expect(verifyTotp(SEED_SHA1, totp(SEED_SHA1, now + 60), { now })).toBeNull();
  });

  it('blocks replay of the last used step and older steps', () => {
    const code = totp(SEED_SHA1, now);
    expect(verifyTotp(SEED_SHA1, code, { now, lastUsedStep: step })).toBeNull();
    const older = totp(SEED_SHA1, now - 30);
    expect(verifyTotp(SEED_SHA1, older, { now, lastUsedStep: step })).toBeNull();
    expect(verifyTotp(SEED_SHA1, code, { now, lastUsedStep: step - 1 })).toBe(step);
  });

  it('rejects malformed codes and tolerates a space', () => {
    expect(verifyTotp(SEED_SHA1, '12345', { now })).toBeNull();
    expect(verifyTotp(SEED_SHA1, 'abcdef', { now })).toBeNull();
    const code = totp(SEED_SHA1, now);
    expect(verifyTotp(SEED_SHA1, `${code.slice(0, 3)} ${code.slice(3)}`, { now })).toBe(step);
  });
});

describe('base32 and key URI', () => {
  it('encodes the RFC seed', () => {
    expect(base32Encode(SEED_SHA1)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq').equals(SEED_SHA1)).toBe(true);
  });

  it('RFC 4648 test vectors', () => {
    const cases: [string, string][] = [
      ['', ''], ['f', 'MY'], ['fo', 'MZXQ'], ['foo', 'MZXW6'],
      ['foob', 'MZXW6YQ'], ['fooba', 'MZXW6YTB'], ['foobar', 'MZXW6YTBOI'],
    ];
    for (const [plain, enc] of cases) {
      expect(base32Encode(Buffer.from(plain))).toBe(enc);
      expect(base32Decode(enc).toString()).toBe(plain);
    }
  });

  it('builds an otpauth URI authenticator apps accept', () => {
    const uri = otpauthUri({
      issuer: 'Vividius Law-firm portal',
      account: 'user@vividius.de',
      secret: SEED_SHA1,
    });
    expect(uri).toBe(
      'otpauth://totp/Vividius%20Law-firm%20portal:user%40vividius.de' +
        '?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Vividius%20Law-firm%20portal' +
        '&algorithm=SHA1&digits=6&period=30'
    );
    expect(formatManualKey(SEED_SHA1)).toBe('GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ');
  });
});
