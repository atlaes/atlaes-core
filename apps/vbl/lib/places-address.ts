// Turns a Google Places result into our address fields.
//
// Keep this file identical to apps/vbl/lib/places-address.ts (the apps share
// no package); apps/gpr/lib/places-address.test.ts runs against both copies.
//
// Two fixes over the first version (VBL address step, Nov 2026):
// - Street line order follows the country: "Unter den Linden 77" for Germany
//   and most of Europe, "350 5th Avenue" for the US, UK, France, etc.
//   Google's address_components carry no order, and the old code always put
//   the number first, which is wrong on German forms.
// - Google sometimes resolves to the street only (no street_number, often no
//   postal_code). The house number the customer typed is then kept instead of
//   being dropped.

export interface PlaceAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface ParsedPlace {
  /** Street and house number in the country's order; '' if Google had no
   * street (then the caller keeps what the customer typed). */
  streetAndNumber: string;
  postalCode: string;
  city: string;
  /** ISO 3166-1 alpha-2, upper case; '' if unknown. */
  countryCode: string;
}

/** Countries that write the house number before the street name. Every
 * other country gets "Street Number" (Germany, Austria, Switzerland, the
 * Netherlands, Italy, Spain, Poland, Turkey, Latin America, ...). */
export const NUMBER_FIRST_COUNTRIES: ReadonlySet<string> = new Set([
  'US',
  'CA',
  'PR',
  'GB',
  'IE',
  'AU',
  'NZ',
  'FR',
  'MC',
  'LU',
  'IN',
  'PH',
  'SG',
  'MY',
  'ZA',
  'IL',
]);

// "5", "12a", "12-14", "7/1"
const HOUSE_NUMBER = /^\d{1,5}[a-z]?(?:[-/]\d{1,5}[a-z]?)?$/i;

/**
 * The house number in what the customer typed, or ''.
 * Number-first countries: the leading token ("350 Fifth Av" → "350").
 * Others: the first number after a word, at most 4 digits so a postcode is
 * not taken for it ("Hauptstraße 5 Heidelb" → "5",
 * "Friedrichstraße 43 10117" → "43").
 */
export function typedHouseNumber(typed: string, numberFirst: boolean): string {
  const tokens = typed
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (numberFirst) {
    return tokens.length > 1 && HOUSE_NUMBER.test(tokens[0]) ? tokens[0] : '';
  }
  for (let i = 1; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (
      HOUSE_NUMBER.test(t) &&
      (t.match(/^\d+/)?.[0].length ?? 0) <= 4 &&
      // the token before has a letter (any script), not only digits/marks
      /[^\d\s.,;:#/()-]/.test(tokens[i - 1])
    ) {
      return t;
    }
  }
  return '';
}

export function parsePlace(
  components: PlaceAddressComponent[] | undefined,
  typed = ''
): ParsedPlace {
  const parts: Record<string, string> = {};
  (components ?? []).forEach((c) => {
    c.types.forEach((t) => {
      if (!(t in parts)) {
        parts[t] = c.long_name;
        parts[`${t}__short`] = c.short_name;
      }
    });
  });

  const countryCode = (parts.country__short ?? '').toUpperCase();
  const numberFirst = NUMBER_FIRST_COUNTRIES.has(countryCode);
  const route = (parts.route ?? '').trim();
  const number =
    (parts.street_number ?? '').trim() || typedHouseNumber(typed, numberFirst);

  let streetAndNumber = '';
  if (route) {
    streetAndNumber = !number
      ? route
      : numberFirst
        ? `${number} ${route}`
        : `${route} ${number}`;
  }

  return {
    streetAndNumber,
    postalCode: parts.postal_code ?? '',
    city:
      parts.locality ||
      parts.postal_town ||
      parts.sublocality ||
      parts.administrative_area_level_3 ||
      '',
    countryCode,
  };
}
