import { PDFDocument } from 'pdf-lib';
import { loadPoaHolderId } from './assets';
import { formatGermanDate } from './format';
import { renderCoverLetter } from './cover-letter';
import { renderPoaLetter } from './poa-letter';
import { fillL203 } from './l203-form';
import { appendImageAsA4Page, appendPdfNormalizedToA4 } from './normalize-a4';

export interface ClaimPdfInput {
  claim: {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // YYYY-MM-DD (raw claim value)
    placeOfBirth: string;
    currentAddressLine1: string;
    currentAddressLine2: string | null;
    currentCity: string;
    currentPostalCode: string;
    currentCountry: string | null;
    svNummer: string;
    iban: string;
    swiftBic: string | null;
    accountHolderName: string | null;
    bankName: string | null;
    bankCity: string | null;
  };
  signaturePng: Uint8Array;
  passport: { bytes: Uint8Array; fileType: string }; // pdf or image
  now?: Date; // injectable for tests
}

const PASSPORT_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

/**
 * Builds the PoA letter's `streetAddress` field from the claim's current
 * address. The Vollmachtgeber's legal address must be complete, so line 2
 * (e.g. apartment/suite) is appended when present.
 */
export function toPoaStreetAddress(claim: {
  currentAddressLine1: string;
  currentAddressLine2: string | null;
}): string {
  return claim.currentAddressLine2
    ? `${claim.currentAddressLine1}, ${claim.currentAddressLine2}`
    : claim.currentAddressLine1;
}

/**
 * Pure assembler: builds the full combined VBL claim PDF package from
 * already-resolved input data (no DB/S3 access). Assembly order (fixed):
 * 1 cover letter -> 2 L203 (3 pages) -> 3 PoA letter -> 4 user passport
 * (normalized to A4) -> 5 PoA-holder ID.
 */
export async function assembleClaimPdf(
  input: ClaimPdfInput
): Promise<Uint8Array> {
  const { claim, signaturePng, passport } = input;
  const now = input.now ?? new Date();
  const dateToday = formatGermanDate(now);
  const vblReference = claim.svNummer;

  const combined = await PDFDocument.create();

  // 1. Cover letter
  await renderCoverLetter(combined, {
    firstName: claim.firstName,
    lastName: claim.lastName,
    vblReference,
    signingPlace: claim.currentCity,
    dateToday,
    signaturePng,
  });

  // 2. L203 (flattened, 3 pages) — merged in via copyPages.
  const l203Doc = await fillL203({
    vblReference,
    firstName: claim.firstName,
    lastName: claim.lastName,
    dateOfBirth: claim.dateOfBirth,
    placeOfBirth: claim.placeOfBirth,
    // The L203 form splits Straße / Hausnr from line 1; line 2 is passed
    // as a fallback house-number source for UK/US addresses that split the
    // number into line 2 (e.g. line1="Abbey Road", line2="111"). See
    // resolveStreetAndHouseNumber in l203-form.ts.
    addressLine1: claim.currentAddressLine1,
    addressLine2: claim.currentAddressLine2,
    postalCode: claim.currentPostalCode,
    city: claim.currentCity,
    country: claim.currentCountry,
    iban: claim.iban,
    swiftBic: claim.swiftBic,
    accountHolderName: claim.accountHolderName,
    bankName: claim.bankName,
    bankCity: claim.bankCity,
    ortDatum: `${claim.currentCity}, ${dateToday}`,
    signaturePng,
  });
  const l203Pages = await combined.copyPages(l203Doc, l203Doc.getPageIndices());
  for (const page of l203Pages) {
    combined.addPage(page);
  }

  // 3. PoA letter
  await renderPoaLetter(combined, {
    firstName: claim.firstName,
    lastName: claim.lastName,
    streetAddress: toPoaStreetAddress(claim),
    postalCode: claim.currentPostalCode,
    city: claim.currentCity,
    dateOfBirth: formatGermanDate(claim.dateOfBirth),
    placeOfBirth: claim.placeOfBirth,
    vblReference,
    dateToday,
    signaturePng,
  });

  // 4. User passport, normalized to A4.
  if (passport.fileType === 'application/pdf') {
    await appendPdfNormalizedToA4(combined, passport.bytes);
  } else if (PASSPORT_IMAGE_MIME_TYPES.has(passport.fileType)) {
    await appendImageAsA4Page(
      combined,
      passport.bytes,
      passport.fileType as 'image/png' | 'image/jpeg' | 'image/jpg'
    );
  } else {
    throw new Error(`Unsupported passport file type: ${passport.fileType}`);
  }

  // 5. PoA-holder ID (pre-built A4 PDF asset).
  const poaHolderDoc = await PDFDocument.load(loadPoaHolderId());
  const poaHolderPages = await combined.copyPages(
    poaHolderDoc,
    poaHolderDoc.getPageIndices()
  );
  for (const page of poaHolderPages) {
    combined.addPage(page);
  }

  return combined.save();
}
