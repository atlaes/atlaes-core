/**
 * Deutsche Rentenversicherung carrier data for the office finder
 * (extracted from `gpr-office-finder.html` v2.2, 11 Sep 2026).
 *
 * - Carrier postal addresses VERIFIED 27 Aug 2026 against the official DRV
 *   Anschriften-Übersicht (main seats). Baden-Württemberg mailing address =
 *   Stuttgart (owner decision 31 Aug 2026; the overview lists Karlsruhe
 *   first). Re-verify at each quarterly sweep.
 * - Country → liaison office (Verbindungsstelle) verified against the
 *   official DRV liaison-office table on 25 Aug 2026.
 * - Insurance-number prefixes per VKVV Anlage + owner ruling 25 Aug 2026.
 *
 * Data only; the routing rules live in
 * `components/marketing/widgets/office-routing.ts`.
 */

export type CarrierKey =
  | 'BUND'
  | 'KBS'
  | 'NORD'
  | 'BB'
  | 'MD'
  | 'BSH'
  | 'WF'
  | 'HE'
  | 'RHL'
  | 'BS'
  | 'RLP'
  | 'SL'
  | 'NB'
  | 'SCHW'
  | 'BW'
  | 'OLB';

export interface Carrier {
  key: CarrierKey;
  name: string;
  /** Postal address as printed in the finder result. */
  address: string;
}

export const OFFICE_ADDRESSES_VERIFIED_ON = '2026-08-27';
export const LIAISON_TABLE_VERIFIED_ON = '2026-08-25';

/** The 16 carriers: DRV Bund, Knappschaft-Bahn-See and 14 regional offices. */
export const CARRIERS: Record<CarrierKey, Carrier> = {
  BUND: {
    key: 'BUND',
    name: 'Deutsche Rentenversicherung Bund',
    address: '10704 Berlin, Germany',
  },
  KBS: {
    key: 'KBS',
    name: 'Deutsche Rentenversicherung Knappschaft-Bahn-See',
    address: 'Pieperstraße 14–28, 44789 Bochum, Germany',
  },
  NORD: {
    key: 'NORD',
    name: 'Deutsche Rentenversicherung Nord',
    address: 'Ziegelstraße 150, 23556 Lübeck, Germany',
  },
  BB: {
    key: 'BB',
    name: 'Deutsche Rentenversicherung Berlin-Brandenburg',
    address: 'Bertha-von-Suttner-Straße 1, 15236 Frankfurt (Oder), Germany',
  },
  MD: {
    key: 'MD',
    name: 'Deutsche Rentenversicherung Mitteldeutschland',
    address: 'Georg-Schumann-Straße 146, 04159 Leipzig, Germany',
  },
  BSH: {
    key: 'BSH',
    name: 'Deutsche Rentenversicherung Braunschweig-Hannover',
    address: 'Lange Weihe 6, 30880 Laatzen, Germany',
  },
  WF: {
    key: 'WF',
    name: 'Deutsche Rentenversicherung Westfalen',
    address: 'Gartenstraße 194, 48147 Münster, Germany',
  },
  HE: {
    key: 'HE',
    name: 'Deutsche Rentenversicherung Hessen',
    address: 'Städelstraße 28, 60596 Frankfurt am Main, Germany',
  },
  RHL: {
    key: 'RHL',
    name: 'Deutsche Rentenversicherung Rheinland',
    address: 'Königsallee 71, 40215 Düsseldorf, Germany',
  },
  BS: {
    key: 'BS',
    name: 'Deutsche Rentenversicherung Bayern Süd',
    address: 'Am Alten Viehmarkt 2, 84028 Landshut, Germany',
  },
  RLP: {
    key: 'RLP',
    name: 'Deutsche Rentenversicherung Rheinland-Pfalz',
    address: 'Eichendorffstraße 4–6, 67346 Speyer, Germany',
  },
  SL: {
    key: 'SL',
    name: 'Deutsche Rentenversicherung Saarland',
    address: 'Martin-Luther-Straße 2–4, 66111 Saarbrücken, Germany',
  },
  NB: {
    key: 'NB',
    name: 'Deutsche Rentenversicherung Nordbayern',
    address: 'Wittelsbacherring 11, 95444 Bayreuth, Germany',
  },
  SCHW: {
    key: 'SCHW',
    name: 'Deutsche Rentenversicherung Schwaben',
    address: 'Dieselstraße 9, 86154 Augsburg, Germany',
  },
  BW: {
    key: 'BW',
    name: 'Deutsche Rentenversicherung Baden-Württemberg',
    address: 'Adalbert-Stifter-Straße 105, 70437 Stuttgart, Germany',
  },
  OLB: {
    key: 'OLB',
    name: 'Deutsche Rentenversicherung Oldenburg-Bremen',
    address: 'Huntestraße 11, 26135 Oldenburg, Germany',
  },
};

/** Regional carriers in the finder's dropdown order (Bund and KBS excluded). */
export const REGIONAL_CARRIER_KEYS: CarrierKey[] = [
  'NORD',
  'BB',
  'MD',
  'BSH',
  'WF',
  'HE',
  'RHL',
  'BS',
  'RLP',
  'SL',
  'NB',
  'SCHW',
  'BW',
  'OLB',
];

/**
 * Country (ISO 3166-1 alpha-2) → specialised regional liaison office.
 * Verified against the official DRV liaison-office table, 25 Aug 2026.
 */
export const LIAISON_BY_COUNTRY: Record<string, CarrierKey> = {
  AL: 'RLP',
  AU: 'OLB',
  BE: 'RHL',
  BA: 'BS',
  BR: 'NB',
  BG: 'MD',
  CL: 'RHL',
  DK: 'NORD',
  EE: 'NORD',
  FI: 'NORD',
  FR: 'RLP',
  GR: 'BW',
  GB: 'NORD',
  IN: 'NORD',
  IE: 'NORD',
  IS: 'WF',
  IL: 'RHL',
  IT: 'SCHW',
  JP: 'BSH',
  CA: 'NORD',
  KR: 'BSH',
  XK: 'BS',
  HR: 'BS',
  LV: 'NORD',
  LI: 'BW',
  LT: 'NORD',
  LU: 'RLP',
  MT: 'SCHW',
  MA: 'SCHW',
  NL: 'WF',
  MD: 'NB',
  ME: 'BS',
  MK: 'BS',
  NO: 'NORD',
  AT: 'BS',
  PH: 'BSH',
  PL: 'BB',
  PT: 'NB',
  RO: 'NB',
  SE: 'NORD',
  CH: 'BW',
  RS: 'BS',
  SK: 'BS',
  SI: 'BS',
  ES: 'RHL',
  CZ: 'BS',
  TN: 'SCHW',
  TR: 'NB',
  UA: 'MD',
  HU: 'MD',
  UY: 'RHL',
  US: 'NORD',
  CY: 'BW',
};

/**
 * Regional issuing districts per VKVV Anlage (historical district number →
 * today's carrier). The first two digits of a Versicherungsnummer.
 */
export const REGIONAL_BY_PREFIX: Record<number, CarrierKey> = {
  2: 'NORD',
  3: 'MD',
  4: 'BB',
  8: 'MD',
  9: 'MD',
  10: 'BSH',
  11: 'WF',
  12: 'HE',
  13: 'RHL',
  14: 'BS',
  15: 'BS',
  16: 'RLP',
  17: 'SL',
  18: 'NB',
  19: 'NORD',
  20: 'NB',
  21: 'SCHW',
  23: 'BW',
  24: 'BW',
  25: 'BB',
  26: 'NORD',
  28: 'OLB',
  29: 'BSH',
};

/**
 * Prefixes the VKVV lists individually for Knappschaft-Bahn-See. The range
 * rules (38/39 + 80–89 → KBS, 40–79 → Bund) apply to VALID insurance
 * numbers; Bund numbers are formed as regional district + 40, and 40 alone
 * is the Riester Zulagenstelle, not a pension number.
 */
export const KBS_PREFIXES: number[] = [38, 39, 80, 81, 82, 89];

export interface CountryOption {
  /** ISO 3166-1 alpha-2 (XK = Kosovo). */
  code: string;
  name: string;
}

/** Shown first in the citizenship / residence selects, then a separator. */
export const FEATURED_COUNTRY_CODES: string[] = ['US', 'IN', 'CA', 'AU', 'BR'];

/** Full country list of the widgets (alphabetical). */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo (Republic)' },
  { code: 'CD', name: 'Congo (DR)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macau' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KP', name: 'North Korea' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Türkiye (Turkey)' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

export function countryName(code: string): string {
  const hit = COUNTRY_OPTIONS.filter((c) => c.code === code)[0];
  return hit ? hit.name : code;
}
