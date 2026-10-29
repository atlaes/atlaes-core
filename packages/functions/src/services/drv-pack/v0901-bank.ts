/**
 * V0901 section 11 (Zahlungsweg) for the direct route: the client's own
 * confirmed account in the branch the form provides for it (owner spec
 * "GPR direct route", 29 Oct 2026):
 *
 *   11.1 account in Germany            IBAN_1 (the 20 characters after the
 *                                      pre-printed "DE"), BANK_1 (name, city)
 *   11.2 account in Europe (SEPA)      IBAN_2, BIC_2, BANK_2 (name, city)
 *   11.3 account outside Europe        BANK_AUSLAND_1 bank name + address,
 *                                      BANK_AUSLAND_2 account number,
 *                                      BANK_AUSLAND_3 bank identifiers
 *                                      (SWIFT/BIC, BSB / routing code)
 *   11.4 third-party account holder    always EMPTY on the direct route
 *
 * Pure: no firm or escrow fallback exists. Missing data is reported so the
 * pack is not built.
 */

import { COUNTRY_NAME_DE } from './register';

export interface ClientBankAccount {
  accountHolderName?: string | null;
  bankName?: string | null;
  iban?: string | null;
  swiftBic?: string | null;
  accountNumber?: string | null;
  bsb?: string | null;
  bankStreet?: string | null;
  bankCity?: string | null;
  bankPostalCode?: string | null;
  /** ISO code or country name as stored on the claim. */
  bankCountry?: string | null;
}

export type V0901BankBranch = 'germany' | 'sepa' | 'outside_europe';

export const V0901_SECTION11_FIELDS = [
  'IBAN_1',
  'BANK_1',
  'IBAN_2',
  'BIC_2',
  'BANK_2',
  'BANK_AUSLAND_1',
  'BANK_AUSLAND_2',
  'BANK_AUSLAND_3',
  'KONTO_N_VN_1',
  'KONTO_ANSCHRIFT_1',
] as const;
export type V0901Section11Field = (typeof V0901_SECTION11_FIELDS)[number];

/**
 * IBAN country codes of the SEPA area (EU/EEA, CH, GB, MC, SM, VA, AD and
 * the dependent territories with their own IBAN prefix).
 */
export const SEPA_IBAN_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH', 'GB', 'MC', 'SM', 'VA', 'AD',
  'GI', 'GG', 'JE', 'IM', 'PM',
]); // prettier-ignore

export function compactIban(iban: string | null | undefined): string {
  return (iban ?? '').replace(/\s+/g, '').toUpperCase();
}

/** Structural IBAN check incl. the ISO 13616 mod-97 checksum. */
export function isValidIban(iban: string | null | undefined): boolean {
  const c = compactIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(c)) return false;
  const moved = c.slice(4) + c.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

let countryNames: Map<string, string> | null = null;

/** Lower-cased English and German country names → ISO code (ICU data). */
function countryNameIndex(): Map<string, string> {
  if (countryNames) return countryNames;
  const map = new Map<string, string>([
    ['usa', 'US'],
    ['uk', 'GB'],
  ]);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  try {
    const en = new Intl.DisplayNames(['en'], { type: 'region' });
    const de = new Intl.DisplayNames(['de'], { type: 'region' });
    for (const a of letters)
      for (const b of letters) {
        const iso = a + b;
        for (const dn of [en, de]) {
          const name = dn.of(iso);
          // first code wins (FR before the legacy alias FX)
          if (name && name !== iso && !map.has(name.toLowerCase()))
            map.set(name.toLowerCase(), iso);
        }
      }
  } catch {
    // no ICU data: ISO codes and the register names still work
  }
  for (const [iso, name] of Object.entries(COUNTRY_NAME_DE))
    map.set(name.toLowerCase(), iso);
  countryNames = map;
  return map;
}

export function bankCountryIso(
  value: string | null | undefined
): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return countryNameIndex().get(v.toLowerCase()) ?? null;
}

const t = (v: string | null | undefined) => (v ?? '').trim();

/** "Name, Ort" as the form asks for 11.1 / 11.2. */
function bankNameCity(b: ClientBankAccount): string {
  return [t(b.bankName), t(b.bankCity)].filter(Boolean).join(', ');
}

export interface V0901BankMapping {
  branch: V0901BankBranch | null;
  /** Every section 11 field, unused ones as '' (cleared). */
  fields: Record<V0901Section11Field, string>;
  /** Human labels of what is missing; non-empty → no pack. */
  missing: string[];
  warnings: string[];
}

function emptyFields(): Record<V0901Section11Field, string> {
  return Object.fromEntries(
    V0901_SECTION11_FIELDS.map((f) => [f, ''])
  ) as Record<V0901Section11Field, string>;
}

/**
 * Maps the client's confirmed bank record to V0901 section 11. The branch
 * follows the IBAN's country when an IBAN is given, else the bank
 * country. A non-SEPA IBAN (e.g. TR, BR) goes into 11.3 as the account
 * number.
 */
export function mapV0901Bank(
  b: ClientBankAccount,
  clientName?: string | null
): V0901BankMapping {
  const fields = emptyFields();
  const missing: string[] = [];
  const warnings: string[] = [];
  const iban = compactIban(b.iban);
  const ibanCountry = iban ? iban.slice(0, 2) : null;
  const country = ibanCountry ?? bankCountryIso(b.bankCountry);

  if (!iban && country && SEPA_IBAN_COUNTRIES.has(country)) {
    // A European account without an IBAN cannot be paid via 11.1/11.2.
    return {
      branch: country === 'DE' ? 'germany' : 'sepa',
      fields,
      missing: ['IBAN for the European bank account'],
      warnings,
    };
  }
  if (!iban && !t(b.accountNumber)) {
    return {
      branch: null,
      fields,
      missing: ['client bank account (IBAN or account number)'],
      warnings,
    };
  }
  if (!t(b.bankName)) missing.push('bank name');

  const holder = t(b.accountHolderName);
  if (
    holder &&
    clientName &&
    holder.toLowerCase().replace(/\s+/g, ' ') !==
      clientName.trim().toLowerCase().replace(/\s+/g, ' ')
  ) {
    warnings.push(
      `Account holder "${holder}" differs from the client's name; the direct route pays the client's own account only (11.4 stays empty).`
    );
  }

  let branch: V0901BankBranch;
  if (iban && ibanCountry && SEPA_IBAN_COUNTRIES.has(ibanCountry)) {
    if (!isValidIban(iban)) missing.push('a valid IBAN');
    if (ibanCountry === 'DE') {
      branch = 'germany';
      fields.IBAN_1 = iban.slice(2); // "DE" is pre-printed
      fields.BANK_1 = bankNameCity(b);
    } else {
      branch = 'sepa';
      fields.IBAN_2 = iban;
      fields.BIC_2 = t(b.swiftBic).toUpperCase();
      fields.BANK_2 = bankNameCity(b);
      if (!fields.BIC_2)
        warnings.push('No BIC for the SEPA account; 11.2 BIC left empty.');
    }
  } else {
    branch = 'outside_europe';
    const account = iban || t(b.accountNumber);
    if (!t(b.swiftBic)) missing.push('SWIFT/BIC of the bank');
    if (!country) missing.push('bank country');
    const countryLabel = country
      ? (COUNTRY_NAME_DE[country] ?? t(b.bankCountry))
      : t(b.bankCountry);
    fields.BANK_AUSLAND_1 = [
      t(b.bankName),
      t(b.bankStreet),
      [t(b.bankPostalCode), t(b.bankCity)].filter(Boolean).join(' '),
      countryLabel,
    ]
      .filter(Boolean)
      .join('\n');
    fields.BANK_AUSLAND_2 = iban ? `IBAN ${account}` : account;
    fields.BANK_AUSLAND_3 = [
      t(b.swiftBic) ? `SWIFT/BIC ${t(b.swiftBic).toUpperCase()}` : '',
      t(b.bsb) ? `${country === 'AU' ? 'BSB' : 'Bank code'} ${t(b.bsb)}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    if (!t(b.bankCity))
      warnings.push('Bank address has no city; 11.3 shows name and country.');
  }

  return { branch, fields, missing, warnings };
}
