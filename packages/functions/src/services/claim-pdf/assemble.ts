import { PDFDocument } from 'pdf-lib';
import { loadPoaHolderId } from './assets';
import { formatGermanDate } from './format';
import { fillL203 } from './l203-form';
import { appendImageAsA4Page, appendPdfNormalizedToA4 } from './normalize-a4';
import {
  renderProviderCoverLetter,
  renderProviderPostalAuthority,
  type ProviderLetterFields,
} from '../provider-refund/letters';
import {
  PROVIDER_REFUND_PROVIDERS,
  providerProcedureDescription,
} from '../provider-refund/providers';
import { clientAddressLines } from '../provider-refund/pack';

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
  /** Postal agent from Admin settings (OpsSettingsService.postalAgent). */
  postalAgent: { name: string; lines: string[] };
  now?: Date; // injectable for tests
}

/**
 * The bundled ID copy (poa-holder-id.pdf) is Anna Kliem's; it is enclosed
 * only while she is the postal agent.
 */
export function enclosesAgentIdCopy(agentName: string): boolean {
  return agentName.replace(/\s+/g, ' ').trim().toLowerCase() === 'anna kliem';
}

const PASSPORT_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

/**
 * Pure assembler: builds the combined VBL claim PDF package from already-
 * resolved input data (no DB/S3 access). Order (owner spec "Provider
 * refund direct route", 29 Oct 2026): 1 cover letter -> 2 L203 (3 pages)
 * -> 3 Postempfangsvollmacht -> 4 passport (normalized to A4) -> 5 the
 * postal agent's ID copy (while that is Anna Kliem). The cover letter
 * and Vollmacht are the shared provider templates (provider-refund/).
 */
export async function assembleClaimPdf(
  input: ClaimPdfInput
): Promise<Uint8Array> {
  const { claim, signaturePng, passport } = input;
  const now = input.now ?? new Date();
  const dateToday = formatGermanDate(now);
  const vblReference = claim.svNummer;
  const withAgentId = enclosesAgentIdCopy(input.postalAgent.name);

  const fields: ProviderLetterFields = {
    clientFullName: `${claim.firstName} ${claim.lastName}`,
    clientResidentialAddress: clientAddressLines({
      ...claim,
      stageDetails: null,
      pensionProvider: 'VBL',
      providerRefundBenefit: null,
    }),
    clientDateOfBirth: formatGermanDate(claim.dateOfBirth),
    referenceLabel: 'Versicherungsnummer',
    referenceValue: vblReference,
    provider: PROVIDER_REFUND_PROVIDERS.VBL,
    procedureDescription: providerProcedureDescription('VBL'),
    agentName: input.postalAgent.name,
    agentPostalAddress: input.postalAgent.lines,
    signaturePlace: claim.currentCity,
    signatureDate: dateToday,
  };

  const combined = await PDFDocument.create();

  // 1. Cover letter
  await renderProviderCoverLetter(
    combined,
    {
      ...fields,
      attachmentList: [
        PROVIDER_REFUND_PROVIDERS.VBL.applicationForm,
        `Postempfangsvollmacht für ${input.postalAgent.name}`,
        'Kopie des Reisepasses',
        ...(withAgentId
          ? [
              `Kopie des Personalausweises der Postempfangsbevollmächtigten (${input.postalAgent.name})`,
            ]
          : []),
      ],
    },
    signaturePng
  );

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

  // 3. Postempfangsvollmacht
  await renderProviderPostalAuthority(combined, fields, signaturePng);

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

  // 5. Postal agent's ID (pre-built A4 PDF asset), Anna Kliem only.
  if (withAgentId) {
    const poaHolderDoc = await PDFDocument.load(loadPoaHolderId());
    const poaHolderPages = await combined.copyPages(
      poaHolderDoc,
      poaHolderDoc.getPageIndices()
    );
    for (const page of poaHolderPages) {
      combined.addPage(page);
    }
  }

  return combined.save();
}
