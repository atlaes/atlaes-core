import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '@/lib/country-search';
import { countryCode, preliminaryHint } from './preliminary-verdict';

describe('countryCode', () => {
  it('maps every list entry to its ISO code', () => {
    const wrong = COUNTRIES.filter((c) => countryCode(c.name) !== c.code);
    expect(wrong).toEqual([]);
  });
  it('maps aliases and codes, case-insensitive', () => {
    expect(countryCode('Turkey')).toBe('TR');
    expect(countryCode('czech republic')).toBe('CZ');
    expect(countryCode('United States')).toBe('US');
    expect(countryCode('Kosovo')).toBe('XK');
    expect(countryCode('us')).toBe('US');
    expect(countryCode('Atlantis')).toBeNull();
  });
});

describe('preliminaryHint (Step A1–A5)', () => {
  const code = (c: string, r: string) => {
    const h = preliminaryHint(c, r);
    return h && h.kind === 'verdict' ? h.verdict.code : h && h.kind;
  };
  it('returns the country-only blocks', () => {
    expect(code('DE', 'US')).toBe('citizenship');
    expect(code('GB', 'CA')).toBe('citizenship');
    expect(code('US', 'FR')).toBe('residence-eu-uk');
    expect(code('RS', 'BA')).toBe('residence-exyu');
    expect(code('CA', 'IN')).toBe('residence-india');
    expect(code('IL', 'IL')).toBe('residence-israel');
  });
  it('continues when later answers decide', () => {
    expect(code('IN', 'CA')).toBe('continue');
    expect(code('UA', 'UA')).toBe('continue');
    expect(code('IN', 'IN')).toBe('continue');
    expect(code('UA', 'TR')).toBe('continue');
    expect(code('MK', 'RS')).toBe('continue');
    // Switzerland and the EEA do not block residence
    expect(code('AU', 'CH')).toBe('continue');
    expect(code('NG', 'NO')).toBe('continue');
  });
  it('returns null for unknown countries', () => {
    expect(preliminaryHint('Atlantis', 'CA')).toBeNull();
  });
  it('uses the NOT_NOW copy, never "eligible"', () => {
    const h = preliminaryHint('DE', 'US');
    expect(h && h.kind === 'verdict' && h.verdict.title).toBe(
      'This claim can currently not be filed with Germany Pension Refund'
    );
    expect(h && h.kind === 'verdict' && h.verdict.body).not.toMatch(
      /eligible/i
    );
  });
});
