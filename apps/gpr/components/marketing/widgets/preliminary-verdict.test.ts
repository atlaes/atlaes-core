import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '@/data/countries';
import { countryCode, preliminaryHint } from './preliminary-verdict';

describe('countryCode', () => {
  it('maps every flow-card country to an ISO code', () => {
    const missing = COUNTRIES.filter((c) => !countryCode(c));
    expect(missing).toEqual([]);
  });
  it('maps aliases and is case-insensitive', () => {
    expect(countryCode('Turkey')).toBe('TR');
    expect(countryCode('czech republic')).toBe('CZ');
    expect(countryCode('United States')).toBe('US');
    expect(countryCode('Kosovo')).toBe('XK');
    expect(countryCode('Atlantis')).toBeNull();
  });
});

describe('preliminaryHint', () => {
  const code = (c: string, r: string) => {
    const h = preliminaryHint(c, r);
    return h && h.kind === 'verdict' ? h.verdict.code : h && h.kind;
  };
  it('returns country-only verdicts', () => {
    expect(code('Germany', 'United States')).toBe('eu-citizen');
    expect(code('United Kingdom', 'Canada')).toBe('eu-citizen');
    expect(code('United States', 'France')).toBe('eu-resident');
    expect(code('Serbia', 'Bosnia and Herzegovina')).toBe('ex-yu-resident');
    expect(code('Canada', 'India')).toBe('india-resident');
    expect(code('Israel', 'Israel')).toBe('israel-resident');
  });
  it('continues when later answers decide', () => {
    expect(code('India', 'Canada')).toBe('continue');
    expect(code('Ukraine', 'Ukraine')).toBe('continue');
    expect(code('India', 'India')).toBe('continue');
    // Türkiye residence: the local-pension question decides later
    expect(code('Ukraine', 'Turkey')).toBe('continue');
    // North Macedonian citizens are not in the ex-YU citizen block
    expect(code('North Macedonia', 'Serbia')).toBe('continue');
  });
  it('returns null for unknown names', () => {
    expect(preliminaryHint('Atlantis', 'Canada')).toBeNull();
  });
  it('passes the verdict text through unchanged', () => {
    const h = preliminaryHint('Germany', 'United States');
    expect(h && h.kind === 'verdict' && h.verdict.title).toBe(
      'Not eligible for a refund'
    );
  });
});
