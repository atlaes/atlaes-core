/**
 * Fixed data from the client spec (section 9.9 constants, 9.10 country
 * lookup, threshold table). None of this is intake data.
 */

// ---------------------------------------------------------------------------
// § 3 Abs. 2 Satz 1 BetrAVG thresholds (BRSG II, in force since 22.01.2026):
// 1,5 % (laufende Leistung) / 18/10 (Kapitalleistung) of the monthly
// Bezugsgröße § 18 SGB IV. Add a row every January.
// ---------------------------------------------------------------------------

export interface BavThresholds {
  /** Monthly Bezugsgröße in EUR. */
  bezugsgroesse: number;
  /** 1,5 % of the Bezugsgröße, EUR per month. */
  pension: number;
  /** 18/10 of the Bezugsgröße, EUR one-off. */
  capital: number;
}

export const BAV_THRESHOLDS_BY_YEAR: Readonly<Record<string, BavThresholds>> = {
  '2026': { bezugsgroesse: 3955, pension: 59.33, capital: 7119 },
};

export function getBavThresholds(year: string | number): BavThresholds {
  const row = BAV_THRESHOLDS_BY_YEAR[String(year)];
  if (!row) {
    throw new Error(
      `No § 3 Abs. 2 BetrAVG threshold row for ${year}; add it to BAV_THRESHOLDS_BY_YEAR`
    );
  }
  return row;
}

// ---------------------------------------------------------------------------
// Law firm (LAW variants). Anderkonto details and the per-case file number
// come from configuration / the case, not from here.
// ---------------------------------------------------------------------------

export const LAW_FIRM = {
  name: 'Vividius Rechtsanwälte',
  street: 'Gneisenaustr. 115',
  postalCode: '10961',
  city: 'Berlin',
  lawyerName: 'Katja Chudoba',
  lawyerTitle: 'Rechtsanwältin',
} as const;

// ---------------------------------------------------------------------------
// Residence country (spec 9.10). `phrase` is the German dative phrase that
// follows "in" (→ residence_country); `name` is the nominative German name
// used as the last line of the sender address block. Keys are the intake
// country names (plus common aliases). Countries not listed: the caller
// falls back to the intake name (spec: plain name without article).
// ---------------------------------------------------------------------------

interface CountryEntry {
  phrase: string;
  name: string;
}

const COUNTRIES: Readonly<Record<string, CountryEntry>> = {
  USA: { phrase: 'den USA', name: 'USA' },
  'United States': { phrase: 'den USA', name: 'USA' },
  'United States of America': { phrase: 'den USA', name: 'USA' },
  India: { phrase: 'Indien', name: 'Indien' },
  'South Korea': { phrase: 'Südkorea', name: 'Südkorea' },
  'Korea, Republic of': { phrase: 'Südkorea', name: 'Südkorea' },
  Japan: { phrase: 'Japan', name: 'Japan' },
  Australia: { phrase: 'Australien', name: 'Australien' },
  Canada: { phrase: 'Kanada', name: 'Kanada' },
  Brazil: { phrase: 'Brasilien', name: 'Brasilien' },
  Philippines: { phrase: 'den Philippinen', name: 'Philippinen' },
  Switzerland: { phrase: 'der Schweiz', name: 'Schweiz' },
  Türkiye: { phrase: 'der Türkei', name: 'Türkei' },
  Turkey: { phrase: 'der Türkei', name: 'Türkei' },
  'United Kingdom': {
    phrase: 'dem Vereinigten Königreich',
    name: 'Vereinigtes Königreich',
  },
  UK: { phrase: 'dem Vereinigten Königreich', name: 'Vereinigtes Königreich' },
  'United Arab Emirates': {
    phrase: 'den Vereinigten Arabischen Emiraten',
    name: 'Vereinigte Arabische Emirate',
  },
  Singapore: { phrase: 'Singapur', name: 'Singapur' },
  China: { phrase: 'China', name: 'China' },
  Mexico: { phrase: 'Mexiko', name: 'Mexiko' },
  'New Zealand': { phrase: 'Neuseeland', name: 'Neuseeland' },
  Israel: { phrase: 'Israel', name: 'Israel' },
  'South Africa': { phrase: 'Südafrika', name: 'Südafrika' },
  Serbia: { phrase: 'Serbien', name: 'Serbien' },
  'Bosnia and Herzegovina': {
    phrase: 'Bosnien und Herzegowina',
    name: 'Bosnien und Herzegowina',
  },
  Montenegro: { phrase: 'Montenegro', name: 'Montenegro' },
  'North Macedonia': { phrase: 'Nordmazedonien', name: 'Nordmazedonien' },
  Kosovo: { phrase: 'dem Kosovo', name: 'Kosovo' },
  Albania: { phrase: 'Albanien', name: 'Albanien' },
  Moldova: { phrase: 'der Republik Moldau', name: 'Republik Moldau' },
  Uruguay: { phrase: 'Uruguay', name: 'Uruguay' },
  Chile: { phrase: 'Chile', name: 'Chile' },
  Morocco: { phrase: 'Marokko', name: 'Marokko' },
  Tunisia: { phrase: 'Tunesien', name: 'Tunesien' },
  Ukraine: { phrase: 'der Ukraine', name: 'Ukraine' },
  Thailand: { phrase: 'Thailand', name: 'Thailand' },
  Vietnam: { phrase: 'Vietnam', name: 'Vietnam' },
  Indonesia: { phrase: 'Indonesien', name: 'Indonesien' },
  Malaysia: { phrase: 'Malaysia', name: 'Malaysia' },
  Taiwan: { phrase: 'Taiwan', name: 'Taiwan' },
  'Hong Kong': { phrase: 'Hongkong', name: 'Hongkong' },
  Pakistan: { phrase: 'Pakistan', name: 'Pakistan' },
  Nigeria: { phrase: 'Nigeria', name: 'Nigeria' },
  Egypt: { phrase: 'Ägypten', name: 'Ägypten' },
  Argentina: { phrase: 'Argentinien', name: 'Argentinien' },
  Colombia: { phrase: 'Kolumbien', name: 'Kolumbien' },
};

function lookupCountry(country: string): CountryEntry | null {
  const key = country.trim();
  if (COUNTRIES[key]) return COUNTRIES[key];
  const lower = key.toLowerCase();
  for (const [name, entry] of Object.entries(COUNTRIES)) {
    if (name.toLowerCase() === lower) return entry;
  }
  return null;
}

/**
 * Dative phrase for a country name from intake ("den USA", "der Schweiz"),
 * or null when the country is not in the spec's table.
 */
export function residenceCountryPhrase(country: string): string | null {
  return lookupCountry(country)?.phrase ?? null;
}

/** Nominative German country name for the address block, or null. */
export function residenceCountryName(country: string): string | null {
  return lookupCountry(country)?.name ?? null;
}

/**
 * Countries whose postal address puts the locality before the postal code
 * ("Latham, NY 12110") rather than the German "12110 Latham" order.
 */
export const CITY_BEFORE_POSTAL_CODE = new Set([
  'USA',
  'United States',
  'United States of America',
  'Canada',
  'Australia',
  'New Zealand',
  'United Kingdom',
  'UK',
  'Ireland',
  'India',
  'Pakistan',
  'Nigeria',
  'South Africa',
  'Hong Kong',
]);
