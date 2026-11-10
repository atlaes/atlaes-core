/**
 * Country select behaviour for the eligibility flow (brief § 7):
 * - typeahead matches the START OF A WORD, never any substring
 *   ("U" → Uganda, Ukraine, United Arab Emirates, United Kingdom,
 *   United States, Uruguay, Uzbekistan — nothing else);
 * - aliases resolve to their entry (USA → US, Holland → NL, …);
 * - list order: the visitor's likely country, the five most frequent
 *   client countries, a divider, then all countries A–Z. Never preselect.
 *
 * Entries = `COUNTRY_OPTIONS` (UN members + XK, TW, HK, MO, PS, VA).
 */
import {
  COUNTRY_OPTIONS,
  FEATURED_COUNTRY_CODES,
  type CountryOption,
} from '@/content/offices';

export type { CountryOption };

/**
 * Brief § 7 [DATA SOURCE NEEDED]: until the top-5 citizenships and
 * residence countries are pulled from the Leads sheet, both selects use
 * the order the old widget pinned.
 */
export const TOP_CITIZENSHIPS: string[] = FEATURED_COUNTRY_CODES;
export const TOP_RESIDENCES: string[] = FEATURED_COUNTRY_CODES;

/** Display names that read better than the office-finder list. */
const DISPLAY_NAMES: Record<string, string> = {
  TR: 'Türkiye',
};

/** Brief § 7 aliases (plus the old display names), normalised → code. */
const ALIASES: Array<[string, string]> = [
  ['us', 'US'],
  ['usa', 'US'],
  ['united states', 'US'],
  ['united states of america', 'US'],
  ['america', 'US'],
  ['uk', 'GB'],
  ['britain', 'GB'],
  ['great britain', 'GB'],
  ['england', 'GB'],
  ['uae', 'AE'],
  ['emirates', 'AE'],
  ['korea', 'KR'],
  ['south korea', 'KR'],
  ['turkey', 'TR'],
  ['turkiye', 'TR'],
  ['holland', 'NL'],
  ['czech republic', 'CZ'],
  ['macedonia', 'MK'],
  ['bosnia', 'BA'],
  ['philippines', 'PH'],
  ['the philippines', 'PH'],
  ['hong kong', 'HK'],
  ['taiwan', 'TW'],
  ['palestine', 'PS'],
  ['ivory coast', 'CI'],
  ['cape verde', 'CV'],
  ['swaziland', 'SZ'],
  ['burma', 'MM'],
  ['east timor', 'TL'],
  ['vatican', 'VA'],
  ['holy see', 'VA'],
];

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export const COUNTRIES: CountryOption[] = COUNTRY_OPTIONS.map((c) => ({
  code: c.code,
  name: DISPLAY_NAMES[c.code] || c.name,
})).sort((a, b) => a.name.localeCompare(b.name, 'en'));

const BY_CODE: Record<string, CountryOption> = {};
COUNTRIES.forEach((c) => {
  BY_CODE[c.code] = c;
});

export function countryByCode(code: string | null | undefined) {
  return code ? BY_CODE[code] || null : null;
}

/** Display name for a code (falls back to the code). */
export function countryLabel(code: string | null | undefined): string {
  if (!code) return '';
  const c = BY_CODE[code];
  return c ? c.name : code;
}

/** Normalised name plus the indexes where a word starts. */
function wordStarts(name: string): { n: string; starts: number[] } {
  const n = normalize(name);
  const starts: number[] = [0];
  for (let i = 1; i < n.length; i++) {
    if (!/[a-z0-9]/.test(n[i - 1]) && /[a-z0-9]/.test(n[i])) starts.push(i);
  }
  return { n, starts };
}

const INDEX = COUNTRIES.map((c) => ({ c, ...wordStarts(c.name) }));

/**
 * Countries for a typed query: names that start with it first, then names
 * with a later word that starts with it, then alias hits. An alias counts
 * when it equals the query, or starts with it from 3 typed letters on —
 * so "U" stays the U-list and "Brit" finds the United Kingdom.
 */
export function searchCountries(query: string): CountryOption[] {
  const q = normalize(query);
  if (!q) return COUNTRIES.slice();
  const first: CountryOption[] = [];
  const later: CountryOption[] = [];
  INDEX.forEach(({ c, n, starts }) => {
    if (n.indexOf(q) === 0) first.push(c);
    else if (starts.some((s) => n.indexOf(q, s) === s)) later.push(c);
  });
  const seen: Record<string, true> = {};
  const out: CountryOption[] = [];
  const add = (c: CountryOption | null) => {
    if (c && !seen[c.code]) {
      seen[c.code] = true;
      out.push(c);
    }
  };
  // An exact alias ("usa", "uk") goes to the top.
  ALIASES.forEach(([alias, code]) => {
    if (alias === q) add(BY_CODE[code]);
  });
  first.forEach(add);
  later.forEach(add);
  if (q.length >= 3) {
    ALIASES.forEach(([alias, code]) => {
      if (alias.indexOf(q) === 0) add(BY_CODE[code]);
    });
  }
  return out;
}

/** Exact match of a typed value (name, alias or ISO code) → entry. */
export function resolveCountry(value: string): CountryOption | null {
  const q = normalize(value);
  if (!q) return null;
  for (const { c, n } of INDEX) if (n === q) return c;
  for (const [alias, code] of ALIASES) if (alias === q) return BY_CODE[code];
  return null;
}

export interface CountryListGroups {
  /** Likely country + top five (deduplicated, in that order). */
  pinned: CountryOption[];
  /** All countries A–Z (the pinned ones included). */
  all: CountryOption[];
}

/** List order for an empty query (brief § 7). */
export function orderedCountries(
  likely: string | null,
  top: string[]
): CountryListGroups {
  const pinned: CountryOption[] = [];
  const add = (code: string | null) => {
    const c = countryByCode(code);
    if (c && pinned.indexOf(c) === -1) pinned.push(c);
  };
  add(likely);
  top.forEach(add);
  return { pinned, all: COUNTRIES.slice() };
}

/**
 * Region of a browser locale ("en-US" → "US", "pt-BR" → "BR"). Returns
 * null for a bare language ("en") and for unknown regions.
 */
export function regionOfLocale(locale: string | null | undefined) {
  if (!locale) return null;
  const parts = locale.replace('_', '-').split('-');
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (/^[A-Za-z]{2}$/.test(p)) {
      const code = p.toUpperCase();
      return BY_CODE[code] ? code : null;
    }
  }
  return null;
}

/**
 * Likely country (ordering hint only): the browser's locale region first;
 * when that is absent or ambiguous ("en", or "en-GB" — used by many
 * non-UK visitors) the server-side GeoIP country, else the locale region.
 */
export function likelyCountry(
  locales: readonly string[] | null | undefined,
  geoCountry: string | null | undefined
): string | null {
  let region: string | null = null;
  for (const l of locales || []) {
    region = regionOfLocale(l);
    if (region) break;
  }
  const geo =
    geoCountry && BY_CODE[geoCountry.toUpperCase()]
      ? geoCountry.toUpperCase()
      : null;
  if (region && region !== 'GB') return region;
  return geo || region;
}
