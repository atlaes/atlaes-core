/**
 * DRV carrier register for managed pension-refund claims.
 *
 * Source: "GPR — Claim submission logic + DRV mailing-address register",
 * brief for Karl, 15 Sep 2026, rev. 3 (all owner rulings closed), and the
 * office-finder widget v2.2 (country → liaison office map verified against
 * the official DRV table on 25 Aug 2026).
 *
 * Hard rule from the brief: the *mailing* address (Postanschrift) is its
 * own field and is usually NOT the street address. Where practice routes
 * by prefix to a specific Standort, the prefix selects the address. Street
 * addresses are reference-only and never used for submission.
 *
 * Re-verify against the official DRV pages at the quarterly sweep.
 */

export type CarrierId =
  | 'NORD'
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
  | 'BB'
  | 'OLB'
  | 'KBS'
  | 'BUND';

/** A mailing destination: carrier + (optional) Standort route. */
export interface MailingEntry {
  carrier: CarrierId;
  /** Human label of the Standort route, e.g. "Mitteldeutschland Halle". */
  standort: string;
  /** Postanschrift lines WITHOUT the carrier name (first line). */
  mailingAddress: string[];
  /** Advance-copy e-mail ("vorab per E-Mail an …"). */
  email: string;
  /** Whether the firm currently files via beA to this carrier. */
  beA: boolean;
}

export const CARRIER_NAMES: Record<CarrierId, string> = {
  NORD: 'Deutsche Rentenversicherung Nord',
  MD: 'Deutsche Rentenversicherung Mitteldeutschland',
  BSH: 'Deutsche Rentenversicherung Braunschweig-Hannover',
  WF: 'Deutsche Rentenversicherung Westfalen',
  HE: 'Deutsche Rentenversicherung Hessen',
  RHL: 'Deutsche Rentenversicherung Rheinland',
  BS: 'Deutsche Rentenversicherung Bayern Süd',
  RLP: 'Deutsche Rentenversicherung Rheinland-Pfalz',
  SL: 'Deutsche Rentenversicherung Saarland',
  NB: 'Deutsche Rentenversicherung Nordbayern',
  SCHW: 'Deutsche Rentenversicherung Schwaben',
  BW: 'Deutsche Rentenversicherung Baden-Württemberg',
  BB: 'Deutsche Rentenversicherung Berlin-Brandenburg',
  OLB: 'Deutsche Rentenversicherung Oldenburg-Bremen',
  KBS: 'Deutsche Rentenversicherung Knappschaft-Bahn-See',
  BUND: 'Deutsche Rentenversicherung Bund',
};

/**
 * Reference-only street/visitor addresses (office finder v2.2, verified
 * 27 Aug 2026). Never used for submission — kept for display.
 */
export const CARRIER_OFFICE_ADDRESSES: Record<CarrierId, string> = {
  BUND: '10704 Berlin',
  KBS: 'Pieperstraße 14–28, 44789 Bochum',
  NORD: 'Ziegelstraße 150, 23556 Lübeck',
  BB: 'Bertha-von-Suttner-Straße 1, 15236 Frankfurt (Oder)',
  MD: 'Georg-Schumann-Straße 146, 04159 Leipzig',
  BSH: 'Lange Weihe 6, 30880 Laatzen',
  WF: 'Gartenstraße 194, 48147 Münster',
  HE: 'Städelstraße 28, 60596 Frankfurt am Main',
  RHL: 'Königsallee 71, 40215 Düsseldorf',
  BS: 'Am Alten Viehmarkt 2, 84028 Landshut',
  RLP: 'Eichendorffstraße 4–6, 67346 Speyer',
  SL: 'Martin-Luther-Straße 2–4, 66111 Saarbrücken',
  NB: 'Wittelsbacherring 11, 95444 Bayreuth',
  SCHW: 'Dieselstraße 9, 86154 Augsburg',
  BW: 'Adalbert-Stifter-Straße 105, 70437 Stuttgart',
  OLB: 'Huntestraße 11, 26135 Oldenburg',
};

const E = (
  carrier: CarrierId,
  standort: string,
  mailingAddress: string[],
  email: string,
  beA = false
): MailingEntry => ({ carrier, standort, mailingAddress, email, beA });

const NORD = E('NORD', 'Nord (Lübeck)', ['23544 Lübeck'], 'info@drv-nord.de');
const MD_ERFURT = E(
  'MD',
  'Mitteldeutschland Erfurt',
  ['Kranichfelder Straße 3', '99097 Erfurt'],
  'service@drv-md.de'
);
const MD_HALLE = E(
  'MD',
  'Mitteldeutschland Halle',
  ['Paracelsusstr. 21', '06114 Halle'],
  'service@drv-md.de'
);
const MD_LEIPZIG = E(
  'MD',
  'Mitteldeutschland Leipzig',
  ['Georg-Schumann-Str. 146', '04159 Leipzig'],
  'service@drv-md.de'
);
const BSH = E(
  'BSH',
  'Braunschweig-Hannover (Laatzen)',
  ['30875 Laatzen'],
  'info@drv-bsh.de'
);
const WF = E('WF', 'Westfalen', ['48125 Münster'], 'kontakt@drv-westfalen.de');
const HE = E('HE', 'Hessen', ['60591 Frankfurt am Main'], 'post@drv-hessen.de');
const RHL = E(
  'RHL',
  'Rheinland',
  ['40194 Düsseldorf'],
  'post@drv-rheinland.de'
);
const BS = E(
  'BS',
  'Bayern Süd (Landshut)',
  ['84024 Landshut'],
  'service@drv-bayernsued.de'
);
const RLP = E(
  'RLP',
  'Rheinland-Pfalz',
  ['Eichendorffstr. 4–6', '67346 Speyer'],
  'service@drv-rlp.de'
);
const SL = E(
  'SL',
  'Saarland',
  ['66108 Saarbrücken'],
  'service@drv-saarland.de'
);
const NB = E(
  'NB',
  'Nordbayern',
  ['95440 Bayreuth'],
  'service@drv-nordbayern.de'
);
const SCHW = E('SCHW', 'Schwaben', ['86223 Augsburg'], 'info@drv-schwaben.de');
const BW_STUTTGART = E(
  'BW',
  'Baden-Württemberg Stuttgart',
  ['70429 Stuttgart'],
  'post@drv-bw.de'
);
const BW_KARLSRUHE = E(
  'BW',
  'Baden-Württemberg Karlsruhe',
  ['76122 Karlsruhe'],
  'post@drv-bw.de'
);
const BB = E(
  'BB',
  'Berlin-Brandenburg',
  ['15228 Frankfurt (Oder)'],
  'post@drv-berlin-brandenburg.de'
);
const OLB = E(
  'OLB',
  'Oldenburg-Bremen',
  ['Hauptverwaltung', '26112 Oldenburg'],
  'info@drv-oldenburg-bremen.de'
);
const KBS = E(
  'KBS',
  'Knappschaft-Bahn-See (Essen)',
  ['Rentenversicherung', '45060 Essen'],
  'zentrale@kbs.de'
);
const BUND = E(
  'BUND',
  'Bund (Abt. Internationales)',
  ['Abt. Internationales', '10704 Berlin'],
  'drv@drv-bund.de'
);

/** Regional issuing districts per VKVV Anlage (prefix → mailing entry). */
export const PREFIX_REGISTER: Readonly<Record<number, MailingEntry>> = {
  2: NORD,
  3: MD_ERFURT,
  4: BB,
  8: MD_HALLE,
  9: MD_LEIPZIG,
  10: BSH,
  11: WF,
  12: HE,
  13: RHL,
  14: BS,
  15: BS,
  16: RLP,
  17: SL,
  18: NB,
  19: NORD,
  20: NB,
  21: SCHW,
  23: BW_STUTTGART,
  24: BW_KARLSRUHE,
  25: BB,
  26: NORD,
  28: OLB,
  29: BSH,
};

/**
 * Default mailing entry per carrier when the carrier was chosen without a
 * prefix route (liaison office by citizenship/residence, or KBS/Bund by
 * history). For carriers with several Standorte the brief names the main
 * seat as the default; Baden-Württemberg = Stuttgart (owner decision
 * 31 Aug / 15 Sep 2026), Mitteldeutschland = Leipzig (main seat; confirm
 * at the next sweep).
 */
export const CARRIER_DEFAULT_ENTRY: Readonly<Record<CarrierId, MailingEntry>> =
  {
    NORD,
    MD: MD_LEIPZIG,
    BSH,
    WF,
    HE,
    RHL,
    BS,
    RLP,
    SL,
    NB,
    SCHW,
    BW: BW_STUTTGART,
    BB,
    OLB,
    KBS,
    BUND,
  };

/**
 * Country (ISO 3166-1 alpha-2) → specialised regional liaison office
 * (Verbindungsstelle). Verified against the official DRV liaison-office
 * table on 25 Aug 2026 (office finder v2.2).
 */
export const LIAISON_OFFICE_BY_COUNTRY: Readonly<Record<string, CarrierId>> = {
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

/** German country names for the Verbindungsstelle heading lines. */
export const COUNTRY_NAME_DE: Readonly<Record<string, string>> = {
  AL: 'Albanien',
  AU: 'Australien',
  BE: 'Belgien',
  BA: 'Bosnien und Herzegowina',
  BR: 'Brasilien',
  BG: 'Bulgarien',
  CL: 'Chile',
  DK: 'Dänemark',
  EE: 'Estland',
  FI: 'Finnland',
  FR: 'Frankreich',
  GR: 'Griechenland',
  GB: 'Vereinigtes Königreich',
  IN: 'Indien',
  IE: 'Irland',
  IS: 'Island',
  IL: 'Israel',
  IT: 'Italien',
  JP: 'Japan',
  CA: 'Kanada',
  KR: 'Republik Korea',
  XK: 'Kosovo',
  HR: 'Kroatien',
  LV: 'Lettland',
  LI: 'Liechtenstein',
  LT: 'Litauen',
  LU: 'Luxemburg',
  MT: 'Malta',
  MA: 'Marokko',
  NL: 'Niederlande',
  MD: 'Republik Moldau',
  ME: 'Montenegro',
  MK: 'Nordmazedonien',
  NO: 'Norwegen',
  AT: 'Österreich',
  PH: 'Philippinen',
  PL: 'Polen',
  PT: 'Portugal',
  RO: 'Rumänien',
  SE: 'Schweden',
  CH: 'Schweiz',
  RS: 'Serbien',
  SK: 'Slowakei',
  SI: 'Slowenien',
  ES: 'Spanien',
  CZ: 'Tschechien',
  TN: 'Tunesien',
  TR: 'Türkei',
  UA: 'Ukraine',
  HU: 'Ungarn',
  UY: 'Uruguay',
  US: 'USA',
  CY: 'Zypern',
};

/**
 * Social-security agreement states ("Abkommensstaaten") as listed on the
 * V0901 form (question 6.1). Citizens of these states receive the
 * Rückantwort in the pack.
 */
export const CONTRACTING_STATES: ReadonlySet<string> = new Set([
  'AL',
  'AU',
  'BA',
  'BR',
  'CL',
  'IN',
  'IL',
  'JP',
  'CA',
  'XK',
  'MA',
  'MK',
  'ME',
  'PH',
  'KR',
  'MD',
  'RS',
  'TN',
  'TR',
  'UY',
  'US',
]);

/** Extracts the two-digit issuing prefix from a VSNR in any spacing. */
export function vsnrPrefix(vsnr: string | null | undefined): number | null {
  if (!vsnr) return null;
  const compact = vsnr.replace(/\s+/g, '');
  const m = /^(\d{2})/.exec(compact);
  return m ? Number(m[1]) : null;
}

/** Compact VSNR (no spaces), upper-cased. */
export function compactVsnr(vsnr: string): string {
  return vsnr.replace(/\s+/g, '').toUpperCase();
}

/**
 * VSNR formatted "as on record": 12 345678 A 901. Falls back to the input
 * when it does not parse.
 */
export function formatVsnr(vsnr: string): string {
  const c = compactVsnr(vsnr);
  const m = /^(\d{2})(\d{6})([A-Z])(\d{3})$/.exec(c);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : vsnr.trim();
}

/**
 * Carrier implied by the prefix range. Range rules apply to VALID
 * insurance numbers (owner ruling 25 Aug 2026): 38/39 + 80–89 → KBS,
 * 40–79 → Bund, other valid prefixes → regional carrier.
 */
export function prefixCarrier(prefix: number | null): CarrierId | null {
  if (prefix === null || Number.isNaN(prefix)) return null;
  if (prefix === 38 || prefix === 39 || (prefix >= 80 && prefix <= 89)) {
    return 'KBS';
  }
  if (prefix >= 40 && prefix <= 79) return 'BUND';
  return PREFIX_REGISTER[prefix]?.carrier ?? null;
}

/**
 * Whether a two-digit prefix can occur in a valid German pension insurance
 * number. VKVV lists KBS as 38, 39, 80, 81, 82, 89; Bund numbers are formed
 * as regional district + 40; 40 alone is the Riester Zulagenstelle.
 */
export function isPlausiblePrefix(prefix: number | null): boolean {
  if (prefix === null || Number.isNaN(prefix)) return false;
  if (prefix === 38 || prefix === 39) return true;
  if (prefix === 80 || prefix === 81 || prefix === 82 || prefix === 89) {
    return true;
  }
  if (PREFIX_REGISTER[prefix]) return true;
  if (prefix >= 42 && prefix <= 69 && PREFIX_REGISTER[prefix - 40]) {
    return true;
  }
  return false;
}

/** Mailing entry for a prefix, or null when the prefix is not registered. */
export function mailingEntryForPrefix(
  prefix: number | null
): MailingEntry | null {
  if (prefix === null) return null;
  const carrier = prefixCarrier(prefix);
  if (!carrier) return null;
  if (carrier === 'KBS') return KBS;
  if (carrier === 'BUND') return BUND;
  return PREFIX_REGISTER[prefix] ?? null;
}

/** Full recipient block lines: carrier name + Postanschrift. */
export function recipientLines(entry: MailingEntry): string[] {
  return [CARRIER_NAMES[entry.carrier], ...entry.mailingAddress];
}
