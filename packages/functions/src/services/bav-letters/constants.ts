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
// residence_country: German dative phrase that follows "in" (spec 9.10).
// Keys are the intake country names. Countries not listed render as the
// plain German name without article; the caller must map those.
// ---------------------------------------------------------------------------

export const RESIDENCE_COUNTRY_PHRASES: Readonly<Record<string, string>> = {
  USA: 'den USA',
  'United States': 'den USA',
  'United States of America': 'den USA',
  India: 'Indien',
  'South Korea': 'Südkorea',
  'Korea, Republic of': 'Südkorea',
  Japan: 'Japan',
  Australia: 'Australien',
  Canada: 'Kanada',
  Brazil: 'Brasilien',
  Philippines: 'den Philippinen',
  Switzerland: 'der Schweiz',
  Türkiye: 'der Türkei',
  Turkey: 'der Türkei',
  'United Kingdom': 'dem Vereinigten Königreich',
  UK: 'dem Vereinigten Königreich',
  'United Arab Emirates': 'den Vereinigten Arabischen Emiraten',
  Singapore: 'Singapur',
  China: 'China',
  Mexico: 'Mexiko',
  'New Zealand': 'Neuseeland',
  Israel: 'Israel',
  'South Africa': 'Südafrika',
  Serbia: 'Serbien',
  'Bosnia and Herzegovina': 'Bosnien und Herzegowina',
  Montenegro: 'Montenegro',
  'North Macedonia': 'Nordmazedonien',
  Kosovo: 'dem Kosovo',
  Albania: 'Albanien',
  Moldova: 'der Republik Moldau',
  Uruguay: 'Uruguay',
  Chile: 'Chile',
  Morocco: 'Marokko',
  Tunisia: 'Tunesien',
  Ukraine: 'der Ukraine',
  Thailand: 'Thailand',
  Vietnam: 'Vietnam',
  Indonesia: 'Indonesien',
  Malaysia: 'Malaysia',
  Taiwan: 'Taiwan',
  'Hong Kong': 'Hongkong',
  Pakistan: 'Pakistan',
  Nigeria: 'Nigeria',
  Egypt: 'Ägypten',
  Argentina: 'Argentinien',
  Colombia: 'Kolumbien',
};

/**
 * Returns the dative phrase for a country name from intake, or null when the
 * country is not in the spec's lookup table (caller decides on a fallback).
 */
export function residenceCountryPhrase(country: string): string | null {
  const key = country.trim();
  if (RESIDENCE_COUNTRY_PHRASES[key]) return RESIDENCE_COUNTRY_PHRASES[key];
  const lower = key.toLowerCase();
  for (const [name, phrase] of Object.entries(RESIDENCE_COUNTRY_PHRASES)) {
    if (name.toLowerCase() === lower) return phrase;
  }
  return null;
}
