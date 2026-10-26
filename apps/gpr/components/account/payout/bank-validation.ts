// VERBATIM COPY of packages/functions/src/services/payout-flow/bank-validation.ts
// (the backend validates again). Keep both files identical below this line.
/**
 * Bank-detail validation for the release step (brief Part 2 §3):
 * country-specific fields, only the ones the chosen route needs —
 * IBAN/BIC for IBAN countries, US routing number, India IFSC, UK sort
 * code, Australia BSB, Canada transit/institution, Mexico CLABE, else a
 * plain account number. Pure and dependency-free: the GPR app keeps a
 * verbatim copy (apps/gpr/components/account/payout/bank-validation.ts).
 */

export type PayoutRoute = 'A' | 'B' | 'C';

export type BankFieldKey =
  | 'iban'
  | 'bic'
  | 'accountNumber'
  | 'routingNumber'
  | 'ifsc'
  | 'sortCode'
  | 'bsb'
  | 'transitNumber'
  | 'institutionNumber'
  | 'clabe';

export interface BankFieldSpec {
  key: BankFieldKey;
  label: string;
  required: boolean;
}

export interface BankDetailsInput {
  accountHolder: string;
  bank: string;
  country: string; // ISO 3166-1 alpha-2
  currency: string; // ISO 4217
  iban?: string | null;
  bic?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  ifsc?: string | null;
  sortCode?: string | null;
  bsb?: string | null;
  transitNumber?: string | null;
  institutionNumber?: string | null;
  clabe?: string | null;
}

/** What the Zahlungserklärung and the payout queue need. */
export interface NormalizedAccount {
  accountHolder: string;
  bank: string;
  country: string;
  currency: string;
  iban: string | null;
  bic: string | null;
  accountNumber: string | null;
  routingLabel: string | null;
  routingValue: string | null;
}

// IBAN lengths per country (SWIFT IBAN registry).
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MR: 27,
  MT: 31,
  MU: 30,
  NL: 18,
  NO: 15,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  SA: 24,
  SC: 31,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
};

// SEPA scheme countries (EU/EEA + CH, GB, MC, SM, AD, VA, …).
export const SEPA_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
  'CH',
  'GB',
  'MC',
  'SM',
  'AD',
  'VA',
  'GI',
  'AL',
  'MD',
  'ME',
  'MK',
  'RS',
]);

export const compact = (v: string | null | undefined): string =>
  (v ?? '').replace(/[\s-]/g, '').toUpperCase();

export function isValidIban(raw: string | null | undefined): boolean {
  const iban = compact(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban)) return false;
  const len = IBAN_LENGTHS[iban.slice(0, 2)];
  if (!len || iban.length !== len) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

export function formatIban(raw: string | null | undefined): string {
  return compact(raw)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

export function isValidBic(raw: string | null | undefined): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(compact(raw));
}

/** US ABA routing number: 9 digits, weighted checksum 3-7-1. */
export function isValidAbaRouting(raw: string | null | undefined): boolean {
  const v = compact(raw);
  if (!/^\d{9}$/.test(v)) return false;
  const d = v.split('').map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0 && v !== '000000000';
}

/** India IFSC: 4 letters, a zero, 6 alphanumerics. */
export function isValidIfsc(raw: string | null | undefined): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(compact(raw));
}

/** UK sort code: 6 digits (12-34-56). */
export function isValidSortCode(raw: string | null | undefined): boolean {
  return /^\d{6}$/.test(compact(raw));
}

/** Australia BSB: 6 digits (123-456). */
export function isValidBsb(raw: string | null | undefined): boolean {
  return /^\d{6}$/.test(compact(raw));
}

export function isValidCaTransit(raw: string | null | undefined): boolean {
  return /^\d{5}$/.test(compact(raw));
}

export function isValidCaInstitution(raw: string | null | undefined): boolean {
  return /^\d{3}$/.test(compact(raw));
}

/** Mexico CLABE: 18 digits, weights 3-7-1, check digit (10 − sum mod 10) mod 10. */
export function isValidClabe(raw: string | null | undefined): boolean {
  const v = compact(raw);
  if (!/^\d{18}$/.test(v)) return false;
  const w = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(v[i]) * w[i % 3]) % 10;
  return (10 - (sum % 10)) % 10 === Number(v[17]);
}

/** Generic account number per country (digits; length bounds where known). */
export function isValidAccountNumber(
  raw: string | null | undefined,
  country: string
): boolean {
  const v = compact(raw);
  const bounds: Record<string, [number, number]> = {
    US: [4, 17],
    GB: [8, 8],
    AU: [5, 10],
    CA: [7, 12],
    IN: [9, 18],
    NZ: [15, 16],
  };
  const [min, max] = bounds[country] ?? [4, 34];
  if (country === 'NZ' || country in bounds) {
    return new RegExp(`^\\d{${min},${max}}$`).test(v);
  }
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(v);
}

const F = {
  iban: { key: 'iban', label: 'IBAN' },
  bic: { key: 'bic', label: 'BIC' },
  accountNumber: { key: 'accountNumber', label: 'Account number' },
  routingNumber: { key: 'routingNumber', label: 'Routing number (ABA)' },
  ifsc: { key: 'ifsc', label: 'IFSC' },
  sortCode: { key: 'sortCode', label: 'Sort code' },
  bsb: { key: 'bsb', label: 'BSB' },
  transitNumber: { key: 'transitNumber', label: 'Transit number' },
  institutionNumber: { key: 'institutionNumber', label: 'Institution number' },
  clabe: { key: 'clabe', label: 'CLABE' },
} as const;

const req = (f: { key: BankFieldKey; label: string }, required = true) => ({
  ...f,
  required,
});

/**
 * Fields shown for an account country and route. Route A (SEPA) always
 * needs an IBAN; B (SummitFX) the local clearing details; C (SWIFT) the
 * local details plus a BIC.
 */
export function bankFieldsFor(
  country: string,
  route: PayoutRoute
): BankFieldSpec[] {
  const c = (country || '').toUpperCase();
  const swift = route === 'C';
  if (route === 'A') return [req(F.iban), req(F.bic, false)];
  switch (c) {
    case 'US':
      return [req(F.accountNumber), req(F.routingNumber), req(F.bic, swift)];
    case 'IN':
      return [req(F.accountNumber), req(F.ifsc), req(F.bic, swift)];
    case 'GB':
      return [req(F.accountNumber), req(F.sortCode), req(F.bic, swift)];
    case 'AU':
      return [req(F.accountNumber), req(F.bsb), req(F.bic, swift)];
    case 'CA':
      return [
        req(F.accountNumber),
        req(F.transitNumber),
        req(F.institutionNumber),
        req(F.bic, swift),
      ];
    case 'MX':
      return [req(F.clabe), req(F.bic, swift)];
    default:
      if (IBAN_LENGTHS[c]) return [req(F.iban), req(F.bic, swift)];
      return [req(F.accountNumber), req(F.bic, true)];
  }
}

const CHECKS: Record<BankFieldKey, (v: string, country: string) => boolean> = {
  iban: (v) => isValidIban(v),
  bic: (v) => isValidBic(v),
  accountNumber: (v, c) => isValidAccountNumber(v, c),
  routingNumber: (v) => isValidAbaRouting(v),
  ifsc: (v) => isValidIfsc(v),
  sortCode: (v) => isValidSortCode(v),
  bsb: (v) => isValidBsb(v),
  transitNumber: (v) => isValidCaTransit(v),
  institutionNumber: (v) => isValidCaInstitution(v),
  clabe: (v) => isValidClabe(v),
};

const MESSAGES: Record<BankFieldKey, string> = {
  iban: 'Please enter a valid IBAN.',
  bic: 'Please enter a valid BIC (8 or 11 characters).',
  accountNumber: 'Please enter a valid account number.',
  routingNumber: 'Please enter a valid 9-digit routing number.',
  ifsc: 'Please enter a valid IFSC (e.g. SBIN0001234).',
  sortCode: 'Please enter a valid 6-digit sort code.',
  bsb: 'Please enter a valid 6-digit BSB.',
  transitNumber: 'Please enter a valid 5-digit transit number.',
  institutionNumber: 'Please enter a valid 3-digit institution number.',
  clabe: 'Please enter a valid 18-digit CLABE.',
};

export interface BankValidationResult {
  ok: boolean;
  errors: Partial<
    Record<
      BankFieldKey | 'accountHolder' | 'bank' | 'country' | 'currency',
      string
    >
  >;
  account: NormalizedAccount | null;
}

/** Routing label/value pair as printed on the ZE ("[Routing-Nummer/IFSC/Sort Code/BSB]"). */
function routingOf(
  input: BankDetailsInput,
  country: string,
  route: PayoutRoute
): { label: string | null; value: string | null } {
  if (route === 'A') return { label: null, value: null };
  switch (country) {
    case 'US':
      return { label: 'Routing number', value: compact(input.routingNumber) };
    case 'IN':
      return { label: 'IFSC', value: compact(input.ifsc) };
    case 'GB':
      return { label: 'Sort code', value: compact(input.sortCode) };
    case 'AU':
      return { label: 'BSB', value: compact(input.bsb) };
    case 'CA':
      return {
        label: 'Transit/Institution',
        value: `${compact(input.transitNumber)}-${compact(input.institutionNumber)}`,
      };
    default:
      return { label: null, value: null };
  }
}

export function validateBankDetails(
  input: BankDetailsInput,
  route: PayoutRoute
): BankValidationResult {
  const errors: BankValidationResult['errors'] = {};
  const country = (input.country || '').toUpperCase();
  const currency = (input.currency || '').toUpperCase();
  if (!input.accountHolder?.trim())
    errors.accountHolder = 'Please enter the account holder.';
  if (!input.bank?.trim()) errors.bank = 'Please enter the bank name.';
  if (!/^[A-Z]{2}$/.test(country)) errors.country = 'Please choose a country.';
  if (!/^[A-Z]{3}$/.test(currency))
    errors.currency = 'Please choose the account currency.';
  if (route === 'A' && currency && currency !== 'EUR')
    errors.currency = 'SEPA transfers need a EUR account.';
  if (route === 'A' && country && !SEPA_COUNTRIES.has(country))
    errors.country = 'SEPA transfers need an account in a SEPA country.';

  for (const field of bankFieldsFor(country, route)) {
    const value = (input[field.key] ?? '').toString();
    if (!value.trim()) {
      if (field.required) errors[field.key] = MESSAGES[field.key];
      continue;
    }
    if (!CHECKS[field.key](value, country))
      errors[field.key] = MESSAGES[field.key];
  }
  if (route === 'A' && !errors.iban && country && input.iban) {
    if (compact(input.iban).slice(0, 2) !== country)
      errors.iban = 'The IBAN does not match the account country.';
  }

  const ok = Object.keys(errors).length === 0;
  if (!ok) return { ok, errors, account: null };

  const fields = bankFieldsFor(country, route).map((f) => f.key);
  const routing = routingOf(input, country, route);
  const accountNumber =
    fields.indexOf('iban') >= 0
      ? formatIban(input.iban)
      : fields.indexOf('clabe') >= 0
        ? compact(input.clabe)
        : compact(input.accountNumber);
  return {
    ok,
    errors,
    account: {
      accountHolder: input.accountHolder.trim(),
      bank: input.bank.trim(),
      country,
      currency,
      iban: fields.indexOf('iban') >= 0 ? formatIban(input.iban) : null,
      bic: input.bic?.trim() ? compact(input.bic) : null,
      accountNumber,
      routingLabel: routing.label,
      routingValue: routing.value,
    },
  };
}

// Withdrawn codes Intl still names ("DD" → "Germany", "YU", …).
const DEPRECATED_REGIONS = new Set([
  'AN',
  'BU',
  'CS',
  'DD',
  'DY',
  'FQ',
  'FX',
  'HV',
  'NH',
  'NQ',
  'NT',
  'PC',
  'PU',
  'PZ',
  'RH',
  'SU',
  'TP',
  'UK',
  'VD',
  'WK',
  'YD',
  'YU',
  'ZR',
]);

interface RegionNames {
  of(code: string): string | undefined;
}

/** Intl.DisplayNames without needing the ES2020 lib typings. */
function regionNames(): RegionNames {
  const Ctor = (
    Intl as unknown as {
      DisplayNames?: new (l: string[], o: { type: string }) => RegionNames;
    }
  ).DisplayNames;
  if (!Ctor) throw new Error('Intl.DisplayNames unavailable');
  return new Ctor(['en'], { type: 'region' });
}

/** ISO2 for a country name or code ("Germany", "DE", "de" → "DE"). */
export function countryCode(
  nameOrCode: string | null | undefined
): string | null {
  const v = (nameOrCode ?? '').trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  const target = v.toLowerCase();
  const aliases: Record<string, string> = {
    usa: 'US',
    'united states of america': 'US',
    uk: 'GB',
    'great britain': 'GB',
    england: 'GB',
    deutschland: 'DE',
  };
  if (aliases[target]) return aliases[target];
  try {
    const names = regionNames();
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        if (DEPRECATED_REGIONS.has(code)) continue;
        let name: string | undefined;
        try {
          name = names.of(code);
        } catch {
          continue;
        }
        if (name && name !== code && name.toLowerCase() === target) return code;
      }
    }
  } catch {
    // Intl.DisplayNames unavailable
  }
  return null;
}

export function countryName(code: string | null | undefined): string {
  if (!code) return '';
  try {
    return regionNames().of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Default route for an account currency: EUR → SEPA (no choice). */
export function routeNeedsChoice(currency: string): boolean {
  return (currency || '').toUpperCase() !== 'EUR';
}
