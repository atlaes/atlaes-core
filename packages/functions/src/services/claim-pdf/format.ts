/**
 * Country name (and common variant) → ISO 3166-1 alpha-3. Keys are
 * lowercase; lookups lowercase the input. Includes English names plus the
 * everyday aliases claimants actually type ("UK", "England", "USA", ...).
 */
const ISO3_BY_COUNTRY_NAME: Record<string, string> = {
  afghanistan: 'AFG',
  albania: 'ALB',
  algeria: 'DZA',
  andorra: 'AND',
  angola: 'AGO',
  argentina: 'ARG',
  armenia: 'ARM',
  australia: 'AUS',
  austria: 'AUT',
  azerbaijan: 'AZE',
  bahamas: 'BHS',
  bahrain: 'BHR',
  bangladesh: 'BGD',
  barbados: 'BRB',
  belarus: 'BLR',
  belgium: 'BEL',
  belize: 'BLZ',
  benin: 'BEN',
  bhutan: 'BTN',
  bolivia: 'BOL',
  'bosnia and herzegovina': 'BIH',
  bosnia: 'BIH',
  botswana: 'BWA',
  brazil: 'BRA',
  brunei: 'BRN',
  bulgaria: 'BGR',
  'burkina faso': 'BFA',
  burundi: 'BDI',
  cambodia: 'KHM',
  cameroon: 'CMR',
  canada: 'CAN',
  'cape verde': 'CPV',
  'central african republic': 'CAF',
  chad: 'TCD',
  chile: 'CHL',
  china: 'CHN',
  colombia: 'COL',
  comoros: 'COM',
  congo: 'COG',
  'costa rica': 'CRI',
  croatia: 'HRV',
  cuba: 'CUB',
  cyprus: 'CYP',
  czechia: 'CZE',
  'czech republic': 'CZE',
  'democratic republic of the congo': 'COD',
  denmark: 'DNK',
  djibouti: 'DJI',
  dominica: 'DMA',
  'dominican republic': 'DOM',
  ecuador: 'ECU',
  egypt: 'EGY',
  'el salvador': 'SLV',
  england: 'GBR',
  'equatorial guinea': 'GNQ',
  eritrea: 'ERI',
  estonia: 'EST',
  eswatini: 'SWZ',
  swaziland: 'SWZ',
  ethiopia: 'ETH',
  fiji: 'FJI',
  finland: 'FIN',
  france: 'FRA',
  gabon: 'GAB',
  gambia: 'GMB',
  georgia: 'GEO',
  germany: 'DEU',
  deutschland: 'DEU',
  ghana: 'GHA',
  greece: 'GRC',
  grenada: 'GRD',
  guatemala: 'GTM',
  guinea: 'GIN',
  'guinea-bissau': 'GNB',
  guyana: 'GUY',
  haiti: 'HTI',
  honduras: 'HND',
  'hong kong': 'HKG',
  hungary: 'HUN',
  iceland: 'ISL',
  india: 'IND',
  indonesia: 'IDN',
  iran: 'IRN',
  iraq: 'IRQ',
  ireland: 'IRL',
  israel: 'ISR',
  italy: 'ITA',
  'ivory coast': 'CIV',
  "cote d'ivoire": 'CIV',
  jamaica: 'JAM',
  japan: 'JPN',
  jordan: 'JOR',
  kazakhstan: 'KAZ',
  kenya: 'KEN',
  kiribati: 'KIR',
  kosovo: 'XKX',
  kuwait: 'KWT',
  kyrgyzstan: 'KGZ',
  laos: 'LAO',
  latvia: 'LVA',
  lebanon: 'LBN',
  lesotho: 'LSO',
  liberia: 'LBR',
  libya: 'LBY',
  liechtenstein: 'LIE',
  lithuania: 'LTU',
  luxembourg: 'LUX',
  macau: 'MAC',
  madagascar: 'MDG',
  malawi: 'MWI',
  malaysia: 'MYS',
  maldives: 'MDV',
  mali: 'MLI',
  malta: 'MLT',
  mauritania: 'MRT',
  mauritius: 'MUS',
  mexico: 'MEX',
  moldova: 'MDA',
  monaco: 'MCO',
  mongolia: 'MNG',
  montenegro: 'MNE',
  morocco: 'MAR',
  mozambique: 'MOZ',
  myanmar: 'MMR',
  burma: 'MMR',
  namibia: 'NAM',
  nepal: 'NPL',
  netherlands: 'NLD',
  holland: 'NLD',
  'new zealand': 'NZL',
  nicaragua: 'NIC',
  niger: 'NER',
  nigeria: 'NGA',
  'north korea': 'PRK',
  'north macedonia': 'MKD',
  macedonia: 'MKD',
  'northern ireland': 'GBR',
  norway: 'NOR',
  oman: 'OMN',
  pakistan: 'PAK',
  palestine: 'PSE',
  panama: 'PAN',
  'papua new guinea': 'PNG',
  paraguay: 'PRY',
  peru: 'PER',
  philippines: 'PHL',
  poland: 'POL',
  portugal: 'PRT',
  qatar: 'QAT',
  romania: 'ROU',
  russia: 'RUS',
  'russian federation': 'RUS',
  rwanda: 'RWA',
  'saudi arabia': 'SAU',
  scotland: 'GBR',
  senegal: 'SEN',
  serbia: 'SRB',
  seychelles: 'SYC',
  'sierra leone': 'SLE',
  singapore: 'SGP',
  slovakia: 'SVK',
  slovenia: 'SVN',
  somalia: 'SOM',
  'south africa': 'ZAF',
  'south korea': 'KOR',
  korea: 'KOR',
  'south sudan': 'SSD',
  spain: 'ESP',
  'sri lanka': 'LKA',
  sudan: 'SDN',
  suriname: 'SUR',
  sweden: 'SWE',
  switzerland: 'CHE',
  syria: 'SYR',
  taiwan: 'TWN',
  tajikistan: 'TJK',
  tanzania: 'TZA',
  thailand: 'THA',
  togo: 'TGO',
  tonga: 'TON',
  'trinidad and tobago': 'TTO',
  tunisia: 'TUN',
  turkey: 'TUR',
  turkiye: 'TUR',
  turkmenistan: 'TKM',
  uganda: 'UGA',
  ukraine: 'UKR',
  'united arab emirates': 'ARE',
  uae: 'ARE',
  'united kingdom': 'GBR',
  'united kingdom of great britain and northern ireland': 'GBR',
  uk: 'GBR',
  'great britain': 'GBR',
  britain: 'GBR',
  'united states': 'USA',
  'united states of america': 'USA',
  usa: 'USA',
  'u.s.a.': 'USA',
  america: 'USA',
  wales: 'GBR',
  uruguay: 'URY',
  uzbekistan: 'UZB',
  vanuatu: 'VUT',
  'vatican city': 'VAT',
  venezuela: 'VEN',
  vietnam: 'VNM',
  yemen: 'YEM',
  zambia: 'ZMB',
  zimbabwe: 'ZWE',
};

/**
 * ISO 3166-1 alpha-2 → alpha-3, for the common claimant countries. Lets
 * `countryToIso3('GB')` resolve to 'GBR'. Kept small and focused rather
 * than exhaustive.
 */
const ISO3_BY_ISO2: Record<string, string> = {
  GB: 'GBR',
  US: 'USA',
  DE: 'DEU',
  AT: 'AUT',
  CH: 'CHE',
  NL: 'NLD',
  FR: 'FRA',
  ES: 'ESP',
  IT: 'ITA',
  PL: 'POL',
  TR: 'TUR',
  IE: 'IRL',
  CA: 'CAN',
  AU: 'AUS',
  NZ: 'NZL',
  ZA: 'ZAF',
  IN: 'IND',
  PH: 'PHL',
  BR: 'BRA',
  CN: 'CHN',
  JP: 'JPN',
  KR: 'KOR',
  ID: 'IDN',
  VN: 'VNM',
  TH: 'THA',
  MY: 'MYS',
  SG: 'SGP',
};

/**
 * Parses a `Date` or `YYYY-MM-DD` string into y/m/d components without
 * introducing timezone shifts. Strings are constructed via
 * `new Date(y, m-1, d)` (local time) rather than `new Date(string)`
 * (which parses as UTC and can shift a day in negative-offset zones).
 */
function toDateParts(d: Date | string): {
  year: number;
  month: number;
  day: number;
} {
  if (typeof d === 'string') {
    const [year, month, day] = d.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a date as German `DD.MM.YYYY`. */
export function formatGermanDate(d: Date | string): string {
  const { year, month, day } = toDateParts(d);
  return `${pad2(day)}.${pad2(month)}.${year}`;
}

/** Formats a date as compact `DDMMYYYY` for the L203 comb field. */
export function formatGermanDateCompact(d: Date | string): string {
  const { year, month, day } = toDateParts(d);
  return `${pad2(day)}${pad2(month)}${year}`;
}

/**
 * Maps a country name, ISO alpha-2, or ISO alpha-3 code to its ISO
 * alpha-3 code. Case-insensitive. Returns '' for unknown input — the
 * form field is left blank rather than guessing.
 */
export function countryToIso3(country: string | null): string {
  if (!country) return '';
  const trimmed = country.trim();
  const upper = trimmed.toUpperCase();
  // ISO alpha-3 pass-through (only when it's a known code, otherwise a
  // random 3-letter name like "abc" would echo back uppercased). All map
  // values are the valid alpha-3 codes, so check membership.
  if (/^[A-Z]{3}$/.test(upper) && VALID_ISO3.has(upper)) return upper;
  const byName = ISO3_BY_COUNTRY_NAME[trimmed.toLowerCase()];
  if (byName) return byName;
  if (/^[A-Z]{2}$/.test(upper)) return ISO3_BY_ISO2[upper] ?? '';
  // Unknown 3-letter tokens that aren't real codes still pass through
  // (preserves prior behavior for uppercase alpha-3 input the map lacks).
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return '';
}

const VALID_ISO3 = new Set(Object.values(ISO3_BY_COUNTRY_NAME));

/**
 * Splits a street line into street name and house number. Handles both
 * German-style trailing house numbers ("Kaskelstraße 46" → street
 * "Kaskelstraße", houseNumber "46", incl. "12a", "12-14", "12/3") and
 * UK/US-style leading house numbers ("111 Abbey Road" → street "Abbey
 * Road", houseNumber "111", incl. "12a Main Street").
 *
 * Trailing-number matching takes precedence, so a German address whose
 * street name happens to start with a digit is never misread.
 */
export function splitStreetHouseNumber(line: string): {
  street: string;
  houseNumber: string;
} {
  const trimmed = line.trim();

  // German style: house number at the end.
  const trailing = trimmed.match(/^(.+?)\s+(\d+\s*[a-zA-Z]?(?:[-/]\d+\w?)?)$/);
  if (trailing) {
    return { street: trailing[1].trim(), houseNumber: trailing[2].trim() };
  }

  // UK/US style: house number at the start (e.g. "111 Abbey Road",
  // "12a Main Street"). Requires a street name after the number.
  const leading = trimmed.match(/^(\d+\s*[a-zA-Z]?(?:[-/]\d+\w?)?)\s+(.+)$/);
  if (leading) {
    return { street: leading[2].trim(), houseNumber: leading[1].trim() };
  }

  return { street: trimmed, houseNumber: '' };
}
