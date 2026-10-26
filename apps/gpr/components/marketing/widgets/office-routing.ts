/**
 * Office-finder routing rules, ported from `gpr-office-finder.html` v2.2
 * (11 Sep 2026). Pure functions; data in `content/offices.ts`.
 *
 * Evaluation order (Canonical Rule Sheet / article "Short answer"):
 *   1. any contribution to Knappschaft-Bahn-See, ever → KBS
 *   2. last office DRV Bund → Bund
 *   (prefix path when the last office is unknown: KBS / Bund prefixes decide,
 *    implausible prefixes are rejected with guidance)
 *   3. liaison office for the citizenship connection
 *   4. liaison office for the residence connection
 *   5. regional carrier holding the account (known, or from the prefix)
 *   6. nothing matched
 * Every result is labelled "recommended first office"; two different
 * treaty/EU connections add the multi-connection caveat.
 */
import {
  CARRIERS,
  KBS_PREFIXES,
  LIAISON_BY_COUNTRY,
  REGIONAL_BY_PREFIX,
  type CarrierKey,
} from '@/content/offices';

export type LastOffice = 'UNKNOWN' | CarrierKey;

export interface OfficeFinderInput {
  lastOffice: LastOffice;
  /** ISO code of the citizenship. */
  citizenship: string;
  /** ISO code of the country of residence. */
  residence: string;
  /** First two digits of the Versicherungsnummer (when lastOffice is UNKNOWN). */
  prefix?: number | null;
}

export type OfficeFinderResult =
  | {
      kind: 'office';
      carrier: CarrierKey;
      name: string;
      address: string;
      reason: string;
      caveats: string[];
    }
  | { kind: 'no-match'; message: string }
  | { kind: 'error'; message: string };

export const CAVEAT_UNKNOWN =
  'Exception: if your last German contributions went to DRV Bund, or you ever paid even one contribution to Knappschaft-Bahn-See, that office is responsible instead. Check your Versicherungsverlauf or any DRV letter if unsure.';
export const CAVEAT_MULTI =
  'Your citizenship and your country of residence connect you to two different treaty or EU countries, so more than one liaison office may be relevant. This result is the recommended first office, not a legal determination — confirm before sending, or ask us. If another office is responsible, the receiving office forwards your application with the date preserved.';
export const MSG_IMPLAUSIBLE =
  'Those first two digits don’t match a valid German pension insurance number. Double-check that you’re reading the Versicherungsnummer — on payslips it’s marked SVNR and looks like “13 160894 M 123” (enter 13). A number beginning 40 on Riester paperwork is a Zulagenstelle number, not your pension insurance number. If you can’t find a DRV number, use “I don’t know my insurance number” below.';
export const NO_ID_GUIDE =
  'Without an insurance number or a recent pension-office letter, include enough identification data with your application: your full name and any former names, date and place of birth, your last German address, your German employers, and your health insurer (Krankenkasse) — the health insurer is often how an account is found.';
export const MSG_NEED_OFFICE =
  "Please select your last pension office (or 'I don't know').";
export const MSG_NEED_COUNTRIES =
  'Please select your citizenship and country of residence.';
export const MSG_NEED_PREFIX =
  'Please enter the first two digits of your German insurance number — or use “I don’t know my insurance number” below to continue with citizenship and residence only.';
export const MSG_NEED_COUNTRIES_NO_NUMBER =
  'Please select your citizenship and country of residence above — we use them to find your liaison office.';
export const MSG_NO_MATCH =
  'Neither your nationality nor your residence has a dedicated liaison office, and we couldn’t identify your account carrier. Check the carrier named on your latest Versicherungsverlauf or DRV letter — or let us find it for you.';
export const MSG_NO_MATCH_NO_NUMBER =
  'Neither your nationality nor your residence has a dedicated liaison office, and without your insurance number we can’t identify your account carrier. ' +
  NO_ID_GUIDE;

const PREFIX_NOTE_BUND =
  'The first two digits show the office that issued your number. If you later moved to a regional carrier, the responsible office can differ — the receiving office will forward your file if needed.';
const PREFIX_NOTE_REGIONAL =
  'The first digits show where your account was opened. If you later worked in another region, the responsible office can differ — the receiving office will forward your file if needed.';

/** Carrier that issued a prefix, or null when the prefix is not allocated. */
export function prefixCarrier(n: number): CarrierKey | null {
  if (isNaN(n)) return null;
  if (n === 38 || n === 39 || (n >= 80 && n <= 89)) return 'KBS';
  if (n >= 40 && n <= 79) return 'BUND';
  return REGIONAL_BY_PREFIX[n] || null;
}

/** Whether two digits can start a valid German pension insurance number. */
export function prefixPlausible(n: number): boolean {
  if (isNaN(n)) return false;
  if (KBS_PREFIXES.indexOf(n) !== -1) return true;
  if (REGIONAL_BY_PREFIX[n]) return true;
  if (n >= 42 && n <= 69 && REGIONAL_BY_PREFIX[n - 40]) return true;
  return false;
}

function office(
  carrier: CarrierKey,
  reason: string,
  caveats: Array<string | null | undefined> = []
): OfficeFinderResult {
  const c = CARRIERS[carrier];
  return {
    kind: 'office',
    carrier,
    name: c.name,
    address: c.address,
    reason,
    caveats: caveats.filter((x): x is string => Boolean(x)),
  };
}

/** Routing without an insurance number (citizenship / residence only). */
export function resolveWithoutNumber(
  citizenship: string,
  residence: string
): OfficeFinderResult {
  if (!citizenship || !residence) {
    return { kind: 'error', message: MSG_NEED_COUNTRIES_NO_NUMBER };
  }
  const byCit = LIAISON_BY_COUNTRY[citizenship];
  const byRes = LIAISON_BY_COUNTRY[residence];
  if (byCit) {
    return office(
      byCit,
      'Even without your insurance number: as a citizen of a country with a social-security connection to Germany, the regional office specialized in your country usually handles your international claim.',
      [
        byRes && byRes !== byCit ? CAVEAT_MULTI : null,
        CAVEAT_UNKNOWN,
        NO_ID_GUIDE,
      ]
    );
  }
  if (byRes) {
    return office(
      byRes,
      'Even without your insurance number: your nationality has no dedicated liaison office, but the country you live in does — the regional office specialized in your country of residence usually handles your claim.',
      [CAVEAT_UNKNOWN, NO_ID_GUIDE]
    );
  }
  return { kind: 'no-match', message: MSG_NO_MATCH_NO_NUMBER };
}

/** The main "Find my pension office" evaluation. */
export function findOffice(input: OfficeFinderInput): OfficeFinderResult {
  const lo = input.lastOffice;
  const nat = input.citizenship;
  const res = input.residence;
  if (!lo) return { kind: 'error', message: MSG_NEED_OFFICE };
  if (!nat || !res) return { kind: 'error', message: MSG_NEED_COUNTRIES };

  // 1. KBS ever → KBS.  2. Last office Bund → Bund.
  if (lo === 'KBS') {
    return office(
      'KBS',
      'Because you paid at least one contribution to Knappschaft-Bahn-See, it remains your responsible office and international liaison office — regardless of nationality or residence.'
    );
  }
  if (lo === 'BUND') {
    return office(
      'BUND',
      'Because your last German contribution went to DRV Bund, it is both your account carrier and your international liaison office.'
    );
  }

  // Determine the (approximate) account carrier
  let carrier: CarrierKey | null = lo !== 'UNKNOWN' ? lo : null;
  let viaPrefix = false;
  if (lo === 'UNKNOWN') {
    const n =
      input.prefix === null || input.prefix === undefined
        ? NaN
        : Number(input.prefix);
    if (isNaN(n)) return { kind: 'error', message: MSG_NEED_PREFIX };
    if (!prefixPlausible(n))
      return { kind: 'no-match', message: MSG_IMPLAUSIBLE };
    const pc = prefixCarrier(n);
    // KBS numbers are only issued by KBS: "ever insured with KBS" is certain here
    if (pc === 'KBS') {
      return office(
        'KBS',
        'Your insurance number was issued by Knappschaft-Bahn-See — which means you were insured with KBS, and KBS remains your responsible office regardless of nationality or residence.'
      );
    }
    if (pc === 'BUND') {
      return office(
        'BUND',
        'Your insurance number was issued by DRV Bund, so your account is most likely held there and DRV Bund handles your claim.',
        [PREFIX_NOTE_BUND]
      );
    }
    carrier = pc; // regional carrier or null
    viaPrefix = true;
  }

  const byCit = LIAISON_BY_COUNTRY[nat];
  const byRes = LIAISON_BY_COUNTRY[res];
  const unknownCaveat = lo === 'UNKNOWN' && !viaPrefix ? CAVEAT_UNKNOWN : null;

  // 3. Specialized liaison office for the citizenship connection
  if (byCit) {
    return office(
      byCit,
      'As a citizen of a country with a social-security connection to Germany, the regional office specialized in your country usually handles your international claim.',
      [byRes && byRes !== byCit ? CAVEAT_MULTI : null, unknownCaveat]
    );
  }
  // 4. Specialized liaison office for the residence connection
  if (byRes) {
    return office(
      byRes,
      'Your nationality has no dedicated liaison office, but the country you live in does — the regional office specialized in your country of residence usually handles your claim.',
      [unknownCaveat]
    );
  }
  // 5. Account-holding regional carrier (known or from prefix)
  if (carrier) {
    return office(
      carrier,
      viaPrefix
        ? 'Based on the first two digits of your insurance number, this office opened your account. Neither your nationality nor your residence reroutes the claim, so it handles your refund directly.'
        : 'Neither your nationality nor your residence has a dedicated liaison office, so the office that holds your insurance account handles your claim directly.',
      [viaPrefix ? PREFIX_NOTE_REGIONAL : null]
    );
  }
  // 6. Nothing matched
  return { kind: 'no-match', message: MSG_NO_MATCH };
}
