/**
 * Submission pack generation for the law-firm portal: maps a claim row to
 * the DRV pack input, reports what is still missing, and freezes the
 * generated PDF on the case. The pure mapping is exported for tests; the
 * storage step lives in `LawFirmService`.
 */

import { PDFDocument } from 'pdf-lib';
import { appendImageAsA4Page } from './claim-pdf/normalize-a4';
import { COUNTRY_NAME_DE } from './drv-pack/register';
import type { PackClient } from './drv-pack/pack';
import type { Sex } from './drv-pack/v0901-form';

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
  };
  return { client, citizenshipIso, residenceIso, missing: [] };
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
