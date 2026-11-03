/**
 * The client's own copy of form A1002 (certificate of life and nationality)
 * for a DRV refund claim: Part A pre-filled from the claim, Part B left for
 * the authority in the country of residence. The GPR app offers it on the
 * identity-confirmation step; the client signs Part A in front of the
 * authority and uploads the certified form.
 *
 * Same filler and language rule as the submission pack (a1002-form.ts).
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../utils/db';
import { claimsTable, resolveCaseType } from '../../drizzle/schema/claims';
import { countryIso } from '../law-firm-pack';
import { COUNTRY_NAME_DE } from './register';
import {
  a1002LanguageForResidence,
  buildA1002,
  type A1002Data,
  type A1002Language,
} from './a1002-form';

export class ClientA1002Error extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 422
  ) {
    super(message);
  }
}

export interface ClientA1002Fields {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  birthName: string | null;
  placeOfBirth: string | null;
  vsnr: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentPostalCode: string | null;
  currentCity: string | null;
  currentCountry: string | null;
}

/**
 * A1002 data from a claim row. Name and date of birth are required (they
 * identify the person the authority certifies); everything else is filled
 * when known and otherwise left for the client to write in.
 */
export function clientA1002Data(f: ClientA1002Fields): {
  data: A1002Data | null;
  missing: string[];
} {
  const missing: string[] = [];
  if (!f.firstName?.trim()) missing.push('first name');
  if (!f.lastName?.trim()) missing.push('last name');
  if (!/^\d{4}-\d{2}-\d{2}/.test(f.dateOfBirth ?? ''))
    missing.push('date of birth');
  if (missing.length) return { data: null, missing };

  const residenceIso = countryIso(f.currentCountry);
  const language: A1002Language = residenceIso
    ? a1002LanguageForResidence(residenceIso)
    : 'en';
  const street = [f.currentAddressLine1, f.currentAddressLine2]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' ');
  const town = [f.currentPostalCode, f.currentCity]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' ');
  return {
    data: {
      vsnr: f.vsnr ?? '',
      lastName: f.lastName!.trim(),
      firstName: f.firstName!.trim(),
      dateOfBirth: f.dateOfBirth!,
      birthName: f.birthName,
      placeOfBirth: f.placeOfBirth,
      address: [street, town].filter(Boolean).join(', '),
      country:
        (residenceIso && COUNTRY_NAME_DE[residenceIso]) ||
        f.currentCountry?.trim() ||
        '',
      language,
    },
    missing: [],
  };
}

/** The pre-filled A1002 for the user's own DRV refund claim. */
export async function buildClientA1002(
  claimId: string,
  userId: string
): Promise<{ bytes: Uint8Array; language: A1002Language; fileName: string }> {
  const [row] = await db
    .select({
      caseType: claimsTable.caseType,
      pensionType: claimsTable.pensionType,
      applicationId: claimsTable.applicationId,
      firstName: claimsTable.firstName,
      lastName: claimsTable.lastName,
      dateOfBirth: claimsTable.dateOfBirth,
      birthName: claimsTable.birthName,
      placeOfBirth: claimsTable.placeOfBirth,
      vsnr: claimsTable.vsnr,
      currentAddressLine1: claimsTable.currentAddressLine1,
      currentAddressLine2: claimsTable.currentAddressLine2,
      currentPostalCode: claimsTable.currentPostalCode,
      currentCity: claimsTable.currentCity,
      currentCountry: claimsTable.currentCountry,
    })
    .from(claimsTable)
    .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
    .limit(1);
  if (!row) throw new ClientA1002Error('Claim not found', 404);
  if (resolveCaseType(row) !== 'drv_refund')
    throw new ClientA1002Error(
      'Form A1002 is only used for German pension refund claims',
      409
    );

  const { data, missing } = clientA1002Data(row);
  if (!data)
    throw new ClientA1002Error(
      `Complete your personal details first (missing: ${missing.join(', ')})`,
      422
    );

  const { doc, language } = await buildA1002(data);
  const bytes = await doc.save();
  // The first download is what the identity step's old "form downloaded"
  // flag recorded; keep it for ops.
  await db
    .update(claimsTable)
    .set({ identityFormDownloadedAt: new Date() })
    .where(
      and(
        eq(claimsTable.id, claimId),
        isNull(claimsTable.identityFormDownloadedAt)
      )
    );
  return {
    bytes,
    language,
    fileName: `A1002-${language.toUpperCase()}-certificate-of-life.pdf`,
  };
}
