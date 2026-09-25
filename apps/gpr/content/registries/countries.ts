/**
 * Country registry — drives the footer country index, the header
 * "Rules by Country" dropdown, `generateStaticParams` for the country
 * template and the go-live cascade (a country becomes a link everywhere
 * the moment `live` flips to true).
 *
 * `live` is true only when the page's route exists in this repo. The
 * fifteen September 2026 pages render from `content/countries/<slug>.ts`;
 * the earlier set (USA, India, …), /former-yugoslavia and /other-countries
 * still live on the Wix site and ship dark here until their pages are
 * built.
 */
import type { CountryArchetype } from '../types';

export interface CountryEntry {
  /** URL slug without leading slash. Live-site slugs are kept verbatim. */
  slug: string;
  /** Display name used in navigation and the footer index. */
  name: string;
  /** "Ukrainian", "Singapore" (residence pages use the country name). */
  demonym: string;
  flag: string;
  /** Route exists in this repo (page under app/(marketing)). */
  live: boolean;
  /** Member of the header "Rules by Country" dropdown. */
  inDropdown: boolean;
  /** Archetype for the pages generated from the September 2026 handoffs. */
  archetype?: CountryArchetype;
  /**
   * Footer entries that point at a combined page (the four ex-Yugoslav
   * states → /former-yugoslavia#<slug>). The entry keeps its own slug for
   * the 301 map and the anchor.
   */
  combinedInto?: string;
  /** Footer footnote marker (†) — used by the ex-Yugoslav entries. */
  footnote?: boolean;
}

export const COUNTRIES: CountryEntry[] = [
  // --- earlier set (Wix live pages; ship dark until built here) ---------
  {
    slug: 'albania',
    name: 'Albania',
    demonym: 'Albanian',
    flag: '🇦🇱',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'australia',
    name: 'Australia',
    demonym: 'Australian',
    flag: '🇦🇺',
    live: false,
    inDropdown: true,
  },
  {
    slug: 'bosnia-herzegovina',
    name: 'Bosnia and Herzegovina',
    demonym: 'Bosnian',
    flag: '🇧🇦',
    live: false,
    inDropdown: false,
    combinedInto: 'former-yugoslavia',
    footnote: true,
  },
  {
    slug: 'brazil',
    name: 'Brazil',
    demonym: 'Brazilian',
    flag: '🇧🇷',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'canada',
    name: 'Canada',
    demonym: 'Canadian',
    flag: '🇨🇦',
    live: false,
    inDropdown: true,
  },
  {
    slug: 'chile',
    name: 'Chile',
    demonym: 'Chilean',
    flag: '🇨🇱',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'india',
    name: 'India',
    demonym: 'Indian',
    flag: '🇮🇳',
    live: false,
    inDropdown: true,
  },
  {
    slug: 'israel',
    name: 'Israel',
    demonym: 'Israeli',
    flag: '🇮🇱',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'japan',
    name: 'Japan',
    demonym: 'Japanese',
    flag: '🇯🇵',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'kosovo',
    name: 'Kosovo',
    demonym: 'Kosovar',
    flag: '🇽🇰',
    live: false,
    inDropdown: false,
    combinedInto: 'former-yugoslavia',
    footnote: true,
  },
  {
    slug: 'moldova',
    name: 'Moldova',
    demonym: 'Moldovan',
    flag: '🇲🇩',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'montenegro',
    name: 'Montenegro',
    demonym: 'Montenegrin',
    flag: '🇲🇪',
    live: false,
    inDropdown: false,
    combinedInto: 'former-yugoslavia',
    footnote: true,
  },
  {
    slug: 'morocco',
    name: 'Morocco',
    demonym: 'Moroccan',
    flag: '🇲🇦',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'north-macedonia',
    name: 'North Macedonia',
    demonym: 'North Macedonian',
    flag: '🇲🇰',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'thephilippines',
    name: 'The Philippines',
    demonym: 'Filipino',
    flag: '🇵🇭',
    live: false,
    inDropdown: true,
  },
  {
    slug: 'serbia',
    name: 'Serbia',
    demonym: 'Serbian',
    flag: '🇷🇸',
    live: false,
    inDropdown: false,
    combinedInto: 'former-yugoslavia',
    footnote: true,
  },
  {
    slug: 'southkorea',
    name: 'South Korea',
    demonym: 'South Korean',
    flag: '🇰🇷',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'tunisia',
    name: 'Tunisia',
    demonym: 'Tunisian',
    flag: '🇹🇳',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'turkey',
    name: 'Türkiye',
    demonym: 'Turkish',
    flag: '🇹🇷',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'uruguay',
    name: 'Uruguay',
    demonym: 'Uruguayan',
    flag: '🇺🇾',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'usa',
    name: 'USA',
    demonym: 'US',
    flag: '🇺🇸',
    live: false,
    inDropdown: true,
  },
  // --- September 2026 set (rendered by app/(marketing)/[country]) --------
  {
    slug: 'argentina',
    name: 'Argentina',
    demonym: 'Argentine',
    flag: '🇦🇷',
    live: true,
    inDropdown: false,
    archetype: 'citizenship',
  },
  {
    slug: 'china',
    name: 'China',
    demonym: 'Chinese',
    flag: '🇨🇳',
    live: true,
    inDropdown: false,
    archetype: 'citizenship-60-first',
  },
  {
    slug: 'egypt',
    name: 'Egypt',
    demonym: 'Egyptian',
    flag: '🇪🇬',
    live: true,
    inDropdown: false,
    archetype: 'citizenship-60-first',
  },
  {
    slug: 'indonesia',
    name: 'Indonesia',
    demonym: 'Indonesian',
    flag: '🇮🇩',
    live: true,
    inDropdown: true,
    archetype: 'hybrid',
  },
  {
    slug: 'mexico',
    name: 'Mexico',
    demonym: 'Mexican',
    flag: '🇲🇽',
    live: true,
    inDropdown: false,
    archetype: 'citizenship-60-first',
  },
  {
    slug: 'new-zealand',
    name: 'New Zealand',
    demonym: 'New Zealand',
    flag: '🇳🇿',
    live: true,
    inDropdown: true,
    archetype: 'citizenship',
  },
  {
    slug: 'nigeria',
    name: 'Nigeria',
    demonym: 'Nigerian',
    flag: '🇳🇬',
    live: true,
    inDropdown: false,
    archetype: 'citizenship',
  },
  {
    slug: 'pakistan',
    name: 'Pakistan',
    demonym: 'Pakistani',
    flag: '🇵🇰',
    live: true,
    inDropdown: true,
    archetype: 'citizenship',
  },
  {
    slug: 'russia',
    name: 'Russia',
    demonym: 'Russian',
    flag: '🇷🇺',
    live: true,
    inDropdown: false,
    archetype: 'citizenship',
  },
  {
    slug: 'singapore',
    name: 'Singapore',
    demonym: 'Singapore',
    flag: '🇸🇬',
    live: true,
    inDropdown: false,
    archetype: 'residence',
  },
  {
    slug: 'south-africa',
    name: 'South Africa',
    demonym: 'South African',
    flag: '🇿🇦',
    live: true,
    inDropdown: false,
    archetype: 'citizenship',
  },
  {
    slug: 'thailand',
    name: 'Thailand',
    demonym: 'Thai',
    flag: '🇹🇭',
    live: true,
    inDropdown: false,
    archetype: 'citizenship-60-first',
  },
  {
    slug: 'uae',
    name: 'UAE',
    demonym: 'UAE',
    flag: '🇦🇪',
    live: true,
    inDropdown: false,
    archetype: 'residence',
  },
  {
    slug: 'ukraine',
    name: 'Ukraine',
    demonym: 'Ukrainian',
    flag: '🇺🇦',
    live: true,
    inDropdown: false,
    archetype: 'citizenship',
  },
  {
    slug: 'vietnam',
    name: 'Vietnam',
    demonym: 'Vietnamese',
    flag: '🇻🇳',
    live: true,
    inDropdown: false,
    archetype: 'citizenship-60-first',
  },
  // --- combined / catch-all pages (always last in the footer) -----------
  {
    slug: 'former-yugoslavia',
    name: 'Former Yugoslavia',
    demonym: 'ex-Yugoslav',
    flag: '',
    live: false,
    inDropdown: false,
  },
  {
    slug: 'other-countries',
    name: 'All other countries',
    demonym: '',
    flag: '',
    live: false,
    inDropdown: true,
  },
];

/** Slugs that render from `content/countries/<slug>.ts`. */
export const GENERATED_COUNTRY_SLUGS: string[] = COUNTRIES.filter(
  (c) => c.archetype !== undefined
).map((c) => c.slug);

export function findCountry(slug: string): CountryEntry | undefined {
  return COUNTRIES.find((c) => c.slug === slug);
}

/** Path of a country entry, honouring combined pages. */
export function countryHref(c: CountryEntry): string {
  return c.combinedInto ? `/${c.combinedInto}#${c.slug}` : `/${c.slug}`;
}

/**
 * Whether the target page of an entry exists. For a combined entry that
 * is the combined page's own `live` flag.
 */
export function countryIsLive(c: CountryEntry): boolean {
  if (!c.combinedInto) return c.live;
  const target = findCountry(c.combinedInto);
  return target ? target.live : false;
}

const localeCompare = (a: string, b: string): number =>
  a.localeCompare(b, 'en', { sensitivity: 'base' });

/**
 * Footer country index: alphabetical by display name ("The Philippines"
 * sorts under P as on the build sheet), then Former Yugoslavia and
 * "All other countries" last.
 */
export function footerCountryIndex(): CountryEntry[] {
  const sortKey = (c: CountryEntry): string => c.name.replace(/^The\s+/i, '');
  const regular = COUNTRIES.filter(
    (c) => c.slug !== 'former-yugoslavia' && c.slug !== 'other-countries'
  ).sort((a, b) => localeCompare(sortKey(a), sortKey(b)));
  const fy = findCountry('former-yugoslavia');
  const other = findCountry('other-countries');
  return [...regular, ...(fy ? [fy] : []), ...(other ? [other] : [])];
}

/**
 * Header dropdown: the build-sheet order (India, USA, Canada, Australia,
 * The Philippines) followed by the three September additions, and
 * "All other countries" always last.
 */
export const DROPDOWN_ORDER: string[] = [
  'india',
  'usa',
  'canada',
  'australia',
  'thephilippines',
  'new-zealand',
  'pakistan',
  'indonesia',
  'other-countries',
];

export function headerCountryDropdown(): CountryEntry[] {
  return DROPDOWN_ORDER.map(findCountry).filter(
    (c): c is CountryEntry => !!c && c.inDropdown
  );
}
