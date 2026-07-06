const ISO3_BY_COUNTRY_NAME: Record<string, string> = {
  philippines: 'PHL',
  australia: 'AUS',
  germany: 'DEU',
  austria: 'AUT',
  switzerland: 'CHE',
  'united states': 'USA',
  usa: 'USA',
  'united kingdom': 'GBR',
  uk: 'GBR',
  'great britain': 'GBR',
  canada: 'CAN',
  'new zealand': 'NZL',
  india: 'IND',
  france: 'FRA',
  italy: 'ITA',
  spain: 'ESP',
  netherlands: 'NLD',
  poland: 'POL',
  turkey: 'TUR',
  brazil: 'BRA',
  china: 'CHN',
  japan: 'JPN',
  'south korea': 'KOR',
  indonesia: 'IDN',
  vietnam: 'VNM',
  thailand: 'THA',
  malaysia: 'MYS',
  singapore: 'SGP',
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
 * Maps a country name (or ISO alpha-3 code) to its ISO alpha-3 code.
 * Returns '' for unknown input — the form field is left blank rather
 * than guessing.
 */
export function countryToIso3(country: string | null): string {
  if (!country) return '';
  const trimmed = country.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return ISO3_BY_COUNTRY_NAME[country.trim().toLowerCase()] ?? '';
}

/**
 * Splits a street line into street name and house number, e.g.
 * "Kaskelstraße 46" → { street: "Kaskelstraße", houseNumber: "46" }.
 * Leading-number formats (e.g. "123 Main Street") don't match and are
 * returned intact with an empty houseNumber.
 */
export function splitStreetHouseNumber(line: string): {
  street: string;
  houseNumber: string;
} {
  const match = line.match(/^(.+?)\s+(\d+\s*[a-zA-Z]?(?:[-/]\d+\w?)?)$/);
  if (!match) return { street: line, houseNumber: '' };
  return { street: match[1], houseNumber: match[2] };
}
