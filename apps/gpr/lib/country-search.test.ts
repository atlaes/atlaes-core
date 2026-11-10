import { describe, expect, it } from 'vitest';
import {
  COUNTRIES,
  likelyCountry,
  orderedCountries,
  regionOfLocale,
  resolveCountry,
  searchCountries,
} from './country-search';

const codes = (q: string) => searchCountries(q).map((c) => c.code);

describe('searchCountries (brief § 7)', () => {
  it('"U" lists only countries with a word starting with U', () => {
    expect(searchCountries('U').map((c) => c.name)).toEqual([
      'Uganda',
      'Ukraine',
      'United Arab Emirates',
      'United Kingdom',
      'United States',
      'Uruguay',
      'Uzbekistan',
    ]);
  });

  it('never matches inside a word', () => {
    expect(codes('stra')).not.toContain('AU');
    expect(codes('a')).not.toContain('US');
  });

  it('matches later words', () => {
    expect(codes('korea')).toEqual(['KR', 'KP']);
    expect(codes('arab')).toContain('AE');
  });

  it.each([
    ['USA', 'US'],
    ['United States', 'US'],
    ['America', 'US'],
    ['UK', 'GB'],
    ['Britain', 'GB'],
    ['England', 'GB'],
    ['Great Britain', 'GB'],
    ['UAE', 'AE'],
    ['Emirates', 'AE'],
    ['Korea', 'KR'],
    ['South Korea', 'KR'],
    ['Turkey', 'TR'],
    ['Türkiye', 'TR'],
    ['Holland', 'NL'],
    ['Czech Republic', 'CZ'],
    ['Macedonia', 'MK'],
    ['Bosnia', 'BA'],
    ['Philippines', 'PH'],
    ['the Philippines', 'PH'],
    ['Hong Kong', 'HK'],
    ['Taiwan', 'TW'],
    ['Palestine', 'PS'],
  ])('alias %s → %s (first hit and exact resolve)', (alias, code) => {
    expect(codes(alias)[0]).toBe(code);
    expect(resolveCountry(alias)?.code).toBe(code);
  });

  it('has the extra entries', () => {
    const all = COUNTRIES.map((c) => c.code);
    ['XK', 'TW', 'HK', 'MO', 'PS', 'VA'].forEach((c) =>
      expect(all).toContain(c)
    );
  });

  it('ignores diacritics', () => {
    expect(codes('sao')).toEqual(['ST']);
  });
});

describe('list order', () => {
  it('likely country first, then the top five, no duplicates', () => {
    const g = orderedCountries('BR', ['US', 'IN', 'CA', 'AU', 'BR']);
    expect(g.pinned.map((c) => c.code)).toEqual(['BR', 'US', 'IN', 'CA', 'AU']);
    expect(g.all.length).toBe(COUNTRIES.length);
  });

  it('locale region wins, en-GB / bare language fall back to GeoIP', () => {
    expect(regionOfLocale('pt-BR')).toBe('BR');
    expect(regionOfLocale('en')).toBeNull();
    expect(likelyCountry(['en-US'], 'PH')).toBe('US');
    expect(likelyCountry(['ko-KR'], null)).toBe('KR');
    expect(likelyCountry(['en-GB'], 'NG')).toBe('NG');
    expect(likelyCountry(['en-GB'], null)).toBe('GB');
    expect(likelyCountry(['en'], 'IN')).toBe('IN');
    expect(likelyCountry(['en'], null)).toBeNull();
  });
});
