/**
 * Submission pack generation for the law-firm portal: maps a claim row to
 * the DRV pack input, reports what is still missing, and freezes the
 * generated PDF on the case. The pure mapping is exported for tests; the
 * storage step lives in `LawFirmService`.
 */

import { PDFDocument } from 'pdf-lib';
import { appendImageAsA4Page } from './claim-pdf/normalize-a4';
import { splitStreetHouseNumber } from './claim-pdf/format';
import { COUNTRY_NAME_DE } from './drv-pack/register';
import type { PackClient } from './drv-pack/pack';
import type { Sex } from './drv-pack/v0901-form';
import { sanitizeV0901Overrides } from './drv-pack/v0901-answers';
import {
  mapV0901Bank,
  type ClientBankAccount,
  type V0901BankMapping,
} from './drv-pack/v0901-bank';

/** Minimal claim shape the mapper needs (subset of claims.$inferSelect). */
export interface DrvClaimFields {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  placeOfBirth: string | null;
  passportNumber: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentCity: string | null;
  currentPostalCode: string | null;
  currentCountry: string | null;
  germanStreet: string | null;
  germanPostalCode: string | null;
  germanCity: string | null;
  moveOutDate: string | null;
  vsnr: string | null;
  sex: string | null;
  birthName: string | null;
  phone: string | null;
  germanContributionMonths: number | null;
  /** Ops overrides of the V0901 answers (claims.v0901_answers). */
  v0901Answers?: unknown;
  // Client's confirmed bank record (direct route: V0901 section 11).
  accountHolderName?: string | null;
  bankName?: string | null;
  iban?: string | null;
  swiftBic?: string | null;
  accountNumber?: string | null;
  bsb?: string | null;
  bankStreet?: string | null;
  bankCity?: string | null;
  bankPostalCode?: string | null;
  bankCountry?: string | null;
}

const ENGLISH_COUNTRY_ISO: Record<string, string> = {
  india: 'IN',
  'united states': 'US',
  usa: 'US',
  'united states of america': 'US',
  australia: 'AU',
  canada: 'CA',
  'south korea': 'KR',
  korea: 'KR',
  japan: 'JP',
  china: 'CN',
  brazil: 'BR',
  mexico: 'MX',
  turkey: 'TR',
  türkiye: 'TR',
  israel: 'IL',
  philippines: 'PH',
  'bosnia and herzegovina': 'BA',
  serbia: 'RS',
  kosovo: 'XK',
  montenegro: 'ME',
  'north macedonia': 'MK',
  albania: 'AL',
  morocco: 'MA',
  tunisia: 'TN',
  'united kingdom': 'GB',
  uk: 'GB',
  chile: 'CL',
  uruguay: 'UY',
  moldova: 'MD',
  argentina: 'AR',
  colombia: 'CO',
  peru: 'PE',
  mozambique: 'MZ',
  'new zealand': 'NZ',
  'south africa': 'ZA',
  thailand: 'TH',
  vietnam: 'VN',
  indonesia: 'ID',
  pakistan: 'PK',
  nigeria: 'NG',
  egypt: 'EG',
};

/** ISO 3166-1 alpha-2 from an ISO code, a German or an English country name. */
export function countryIso(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  const lower = v.toLowerCase();
  if (ENGLISH_COUNTRY_ISO[lower]) return ENGLISH_COUNTRY_ISO[lower];
  for (const [iso, de] of Object.entries(COUNTRY_NAME_DE)) {
    if (de.toLowerCase() === lower) return iso;
  }
  return null;
}

/**
 * German country name for the firm's copy screen ("Indien", "Brasilien"):
 * the DRV register's name, else the ICU name, else the stored value.
 */
export function countryNameDe(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const iso = countryIso(v);
  if (!iso) return v;
  if (COUNTRY_NAME_DE[iso]) return COUNTRY_NAME_DE[iso];
  try {
    const name = new Intl.DisplayNames(['de'], { type: 'region' }).of(iso);
    return name && name !== iso ? name : v;
  } catch {
    return v;
  }
}

/** YYYY-MM-DD → DD.MM.YYYY; anything else passes through. */
function dateDe(value: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (value ?? null);
}

export interface CopyField {
  key: string;
  label: string;
  value: string | null;
}

export interface CopyFieldsInput {
  firstName: string | null;
  lastName: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentPostalCode: string | null;
  currentCity: string | null;
  currentCountry: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  germanStreet: string | null;
  germanPostalCode: string | null;
  germanCity: string | null;
  moveOutDate: string | null;
  lawFirmRef: string | null;
  /** VSNR for DRV cases, contract number for bAV (claims.caseIdentifier). */
  identifier: { label: string; value: string | null } | null;
}

/**
 * Copy fields of the firm's case screen, in the order the owner set on
 * 20 Oct 2026: first name, last name, street, house number, postal code,
 * city, country (German), then the remaining case data. Street and house
 * number are split from the stored address line; an address supplement
 * (line 2) follows the house number only when the client gave one.
 */
export function caseCopyFields(c: CopyFieldsInput): {
  address: CopyField[];
  details: CopyField[];
  german: CopyField[];
} {
  const split = c.currentAddressLine1
    ? splitStreetHouseNumber(c.currentAddressLine1)
    : { street: '', houseNumber: '' };
  const address: CopyField[] = [
    { key: 'firstName', label: 'First name', value: c.firstName },
    { key: 'lastName', label: 'Last name', value: c.lastName },
    { key: 'street', label: 'Street', value: split.street || null },
    {
      key: 'houseNumber',
      label: 'House number',
      value: split.houseNumber || null,
    },
    ...(c.currentAddressLine2?.trim()
      ? [
          {
            key: 'addressSupplement',
            label: 'Address supplement',
            value: c.currentAddressLine2.trim(),
          },
        ]
      : []),
    { key: 'postalCode', label: 'Postal code', value: c.currentPostalCode },
    { key: 'city', label: 'City', value: c.currentCity },
    {
      key: 'country',
      label: 'Country',
      value: countryNameDe(c.currentCountry),
    },
  ];
  const details: CopyField[] = [
    {
      key: 'dateOfBirth',
      label: 'Date of birth',
      value: dateDe(c.dateOfBirth),
    },
    {
      key: 'nationality',
      label: 'Nationality',
      value: countryNameDe(c.nationality),
    },
    ...(c.identifier
      ? [
          {
            key: 'identifier',
            label: c.identifier.label,
            value: c.identifier.value,
          },
        ]
      : []),
  ];
  const german: CopyField[] = [
    {
      key: 'lastGermanAddress',
      label: 'Last German address',
      value:
        [
          c.germanStreet,
          [c.germanPostalCode, c.germanCity].filter(Boolean).join(' '),
        ]
          .filter(Boolean)
          .join(', ') || null,
    },
    { key: 'leftGermany', label: 'Left Germany', value: dateDe(c.moveOutDate) },
    { key: 'aktenzeichen', label: 'Aktenzeichen', value: c.lawFirmRef },
  ];
  return { address, details, german };
}

const SEXES: readonly Sex[] = ['male', 'female', 'none', 'diverse'];

export interface DrvPackMapping {
  client: PackClient | null;
  citizenshipIso: string | null;
  residenceIso: string | null;
  /** Human labels of what has to be collected before the pack can be built. */
  missing: string[];
}

/** Builds the DRV pack client from a claim row, or lists what is missing. */
export function drvPackClientFromClaim(c: DrvClaimFields): DrvPackMapping {
  const missing: string[] = [];
  const need = (label: string, v: string | number | null | undefined) => {
    if (v === null || v === undefined || String(v).trim() === '')
      missing.push(label);
  };
  need('first name', c.firstName);
  need('last name', c.lastName);
  need('date of birth', c.dateOfBirth);
  need('insurance number (VSNR)', c.vsnr);
  need('sex', c.sex);
  need('nationality', c.nationality);
  need('place of birth', c.placeOfBirth);
  need('current street', c.currentAddressLine1);
  need('current postal code', c.currentPostalCode);
  need('current city', c.currentCity);
  need('current country', c.currentCountry);
  need('date of leaving Germany', c.moveOutDate);
  need('last German address', c.germanStreet && c.germanCity ? 'ok' : null);
  need('passport number', c.passportNumber);
  need('German contribution months', c.germanContributionMonths);

  const citizenshipIso = countryIso(c.nationality);
  const residenceIso = countryIso(c.currentCountry);
  if (c.nationality && !citizenshipIso)
    missing.push('nationality as a recognised country');
  if (c.currentCountry && !residenceIso)
    missing.push('current country as a recognised country');
  if (c.sex && !SEXES.includes(c.sex as Sex))
    missing.push('sex (male/female/none/diverse)');

  if (missing.length)
    return { client: null, citizenshipIso, residenceIso, missing };

  const client: PackClient = {
    vsnr: c.vsnr!,
    lastName: c.lastName!,
    firstName: c.firstName!,
    birthName: c.birthName,
    dateOfBirth: c.dateOfBirth!,
    sex: c.sex as Sex,
    citizenshipLabel: c.nationality!,
    citizenshipIso: citizenshipIso!,
    placeOfBirth: c.placeOfBirth!,
    street: c.currentAddressLine1!,
    addressExtra: c.currentAddressLine2,
    postalCode: c.currentPostalCode!,
    city: c.currentCity!,
    countryLabel: COUNTRY_NAME_DE[residenceIso!] ?? c.currentCountry!,
    residenceIso: residenceIso!,
    phone: c.phone,
    dateLeftGermany: c.moveOutDate!,
    lastGermanAddress: [
      c.germanStreet,
      [c.germanPostalCode, c.germanCity].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', '),
    passportNumber: c.passportNumber!,
    germanContributionMonths: c.germanContributionMonths!,
    v0901Answers: sanitizeV0901Overrides(c.v0901Answers) ?? null,
  };
  return { client, citizenshipIso, residenceIso, missing: [] };
}

/** The client's confirmed bank record as stored on the claim. */
export function clientBankFromClaim(c: DrvClaimFields): ClientBankAccount {
  return {
    accountHolderName: c.accountHolderName ?? null,
    bankName: c.bankName ?? null,
    iban: c.iban ?? null,
    swiftBic: c.swiftBic ?? null,
    accountNumber: c.accountNumber ?? null,
    bsb: c.bsb ?? null,
    bankStreet: c.bankStreet ?? null,
    bankCity: c.bankCity ?? null,
    bankPostalCode: c.bankPostalCode ?? null,
    bankCountry: c.bankCountry ?? null,
  };
}

export interface DrvDirectPackMapping extends DrvPackMapping {
  bank: ClientBankAccount;
  bankMapping: V0901BankMapping;
}

/**
 * Direct route: the pack client plus the client's own bank account for
 * V0901 section 11. Missing bank data is listed like any other missing
 * field — the pack is not built, there is no firm/escrow fallback.
 */
export function drvDirectPackClientFromClaim(
  c: DrvClaimFields
): DrvDirectPackMapping {
  const base = drvPackClientFromClaim(c);
  const bank = clientBankFromClaim(c);
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
  const bankMapping = mapV0901Bank(bank, name || null);
  const missing = [
    ...base.missing,
    ...bankMapping.missing.map((m) => `bank: ${m}`),
  ];
  return {
    ...base,
    client: missing.length ? null : base.client,
    missing,
    bank,
    bankMapping,
  };
}

/** S3 key of a frozen pack: one per generation, never overwritten. */
export function submissionPackKey(claimId: string, generatedAt: Date): string {
  return `claims/${claimId}/submission-pack/${generatedAt.toISOString().replace(/[:.]/g, '-')}.pdf`;
}

/** Wraps an uploaded image (passport photo, payslip scan) into a one-page A4 PDF; PDFs pass through. */
export async function attachmentAsPdf(
  bytes: Uint8Array,
  fileType: string
): Promise<Uint8Array | null> {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return bytes;
  if (type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
    const doc = await PDFDocument.create();
    await appendImageAsA4Page(
      doc,
      bytes,
      type.includes('png') ? 'image/png' : 'image/jpeg'
    );
    return doc.save();
  }
  return null;
}
