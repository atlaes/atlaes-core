/**
 * Direct submission pack for KVBW ZVK, VddB and VddKO refunds (owner spec
 * 29 Oct 2026). Order: provider cover letter → application form →
 * Postempfangsvollmacht → passport copy → additional documents. The
 * cover letter's attachment list is generated from the final pack.
 *
 * - VddB/VddKO: the official form is filled from the case (stage-form).
 * - KVBW ZVK: no fillable form is on file; admin uploads the completed,
 *   client-signed form (claim document role 'provider_form').
 *
 * The VBL keeps its lettershop pack (claim-pdf/assemble), which now uses
 * the same cover letter and Postempfangsvollmacht.
 */

import { PDFDocument } from 'pdf-lib';
import { countryToIso2 } from '../claim-pdf/format';
import { appendPdfNormalizedToA4 } from '../claim-pdf/normalize-a4';
import { countryNameDe } from '../law-firm-pack';
import {
  renderProviderCoverLetter,
  renderProviderPostalAuthority,
  type ProviderLetterFields,
} from './letters';
import {
  directProviderCodeOf,
  PROVIDER_REFUND_PROVIDERS,
  providerProcedureDescription,
  resolveStageBenefit,
  type ProviderRefundCode,
  type StageBenefit,
} from './providers';
import { fillStageForm, membershipDigits } from './stage-form';

export { directProviderCodeOf } from './providers';

/** The claim columns the provider pack reads. */
export interface ProviderRefundClaim {
  pensionProvider: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentCity: string | null;
  currentPostalCode: string | null;
  currentCountry: string | null;
  svNummer: string | null;
  iban: string | null;
  swiftBic: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankCity: string | null;
  stageDetails: unknown;
  providerRefundBenefit: string | null;
}

interface StageDetailsShape {
  stageName?: string;
  rolePosition?: string;
  employmentEndDate?: string;
  permanentlyStopped?: 'yes' | 'no';
  reasonForLeaving?: string;
  reasonForLeavingOther?: string;
  currentOccupation?: string;
  unableToWorkHealth?: 'yes' | 'no';
}

/** Field 18.1, from the client's stage answers (English keys). */
const REASON_DE: Record<string, string> = {
  contract_ended: 'Vertragsende / keine Verlängerung',
  health: 'Gesundheitliche Gründe',
  career_change: 'Berufswechsel',
  retirement: 'Ruhestand',
  relocation: 'Umzug / Wegzug',
};

const filled = (v: string | null | undefined) => (v ?? '').trim() !== '';
const t = (v: string | null | undefined) => (v ?? '').trim();

/** YYYY-MM-DD → DD.MM.YYYY; anything else passes through. */
export function dateDe(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : t(value);
}

/** German country name ("Irland"), also for English names the DRV list lacks. */
function countryDe(country: string | null): string {
  const iso2 = countryToIso2(country);
  return countryNameDe(iso2 || country) ?? '';
}

function isGermany(country: string | null): boolean {
  return /^(de|deu|germany|deutschland)$/i.test(t(country));
}

/** Street, supplement, "PLZ Ort", country (German name; none for Germany). */
export function clientAddressLines(c: ProviderRefundClaim): string[] {
  return [
    t(c.currentAddressLine1),
    t(c.currentAddressLine2),
    `${t(c.currentPostalCode)} ${t(c.currentCity)}`.trim(),
    isGermany(c.currentCountry) ? '' : countryDe(c.currentCountry),
  ].filter(Boolean);
}

/**
 * What the pack needs from the case (pure). `missing` blocks generation;
 * `warnings` are shown to admin.
 */
export function providerRefundMapping(c: ProviderRefundClaim): {
  code: ProviderRefundCode | null;
  benefit: StageBenefit | null;
  missing: string[];
  warnings: string[];
} {
  const code = directProviderCodeOf(c.pensionProvider);
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!code) return { code, benefit: null, missing, warnings };
  if (!filled(c.firstName) || !filled(c.lastName)) missing.push('client name');
  if (!filled(c.dateOfBirth)) missing.push('date of birth');
  if (!filled(c.currentAddressLine1) || !filled(c.currentPostalCode))
    missing.push('residential address');
  if (!filled(c.currentCity)) missing.push('city (signing place)');
  if (!filled(c.svNummer)) missing.push('Versicherungsnummer');
  if (!filled(c.iban)) missing.push('IBAN');

  const stage = code === 'VddB' || code === 'VddKO';
  const benefit = stage ? resolveStageBenefit(c) : null;
  if (stage) {
    if (!filled(c.bankName)) missing.push('bank name');
    if (!membershipDigits(c.svNummer))
      warnings.push(
        'The Versicherungsnummer does not fit the form field (up to 6 digits after "J/B–" or "J/O–"); field 2 is left empty, write it in by hand.'
      );
    if (!filled(c.swiftBic))
      warnings.push('No BIC on file; field 25 of the form stays empty.');
    const s = (c.stageDetails ?? {}) as StageDetailsShape;
    if (!filled(s.stageName))
      warnings.push('Stage/orchestra name missing (form field 15).');
    warnings.push(
      `Add the ${code} form "Angaben zur Steuer-Identifikationsnummer" as an extra document before release.`
    );
  }
  return { code, benefit, missing, warnings };
}

export interface ProviderPackDocument {
  key: string;
  label: string;
  pages: number;
}

export interface ProviderPackManifest {
  route: 'direct';
  kind: 'provider_refund';
  provider: ProviderRefundCode;
  benefit: StageBenefit | null;
  aktenzeichen: null;
  generatedAt: string;
  recipient: { carrierName: string; mailingAddress: string[] };
  postalAgent: { name: string; lines: string[] };
  anlagen: string[];
  documents: ProviderPackDocument[];
  signed: boolean;
  signatureDate: string;
  signaturePlace: string;
  totalPages: number;
  warnings: string[];
}

export class ProviderPackIncompleteError extends Error {
  constructor(readonly missing: string[]) {
    super(`Provider pack incomplete: ${missing.join(', ')}`);
    this.name = 'ProviderPackIncompleteError';
  }
}

export interface ProviderPackInput {
  claim: ProviderRefundClaim;
  date: Date;
  signaturePng: Uint8Array | null;
  signedAt: Date | null;
  postalAgent: { name: string; lines: string[] };
  /** Passport/ID copy as PDF. */
  passportPdf: Uint8Array | null;
  /** KVBW: the completed, client-signed application form (PDF). */
  providerFormPdf: Uint8Array | null;
  extraDocuments: { label: string; pdf: Uint8Array }[];
}

export async function buildProviderRefundPack(
  input: ProviderPackInput
): Promise<{ pdf: Uint8Array; manifest: ProviderPackManifest }> {
  const c = input.claim;
  const mapping = providerRefundMapping(c);
  if (!mapping.code)
    throw new ProviderPackIncompleteError(['supported pension provider']);
  const missing = [...mapping.missing];
  const provider = PROVIDER_REFUND_PROVIDERS[mapping.code];
  if (!provider.formFilledBySystem && !input.providerFormPdf)
    missing.push(`completed ${provider.label} application form (upload)`);
  if (missing.length) throw new ProviderPackIncompleteError(missing);

  const warnings = [...mapping.warnings];
  const signed = !!input.signaturePng;
  if (!signed)
    warnings.push(
      'No online signature from the client: the documents carry empty signature lines and the pack cannot be released.'
    );
  if (!provider.formFilledBySystem)
    warnings.push(
      `The ${provider.label} application form is the uploaded copy; check that the client signed it.`
    );
  const signingDate = dateDe(
    (input.signedAt ?? input.date).toISOString().slice(0, 10)
  );
  const fields: ProviderLetterFields = {
    clientFullName: `${t(c.firstName)} ${t(c.lastName)}`,
    clientResidentialAddress: clientAddressLines(c),
    clientDateOfBirth: dateDe(c.dateOfBirth),
    referenceLabel: 'Versicherungsnummer',
    referenceValue: t(c.svNummer),
    provider,
    procedureDescription: providerProcedureDescription(
      mapping.code,
      mapping.benefit
    ),
    agentName: input.postalAgent.name,
    agentPostalAddress: input.postalAgent.lines,
    signaturePlace: t(c.currentCity),
    signatureDate: signingDate,
  };

  const parts: { key: string; label: string; doc: PDFDocument }[] = [];
  const asDoc = async (bytes: Uint8Array) => {
    const d = await PDFDocument.create();
    await appendPdfNormalizedToA4(d, bytes);
    return d;
  };

  // 2 Application form
  if (mapping.code === 'VddB' || mapping.code === 'VddKO') {
    const s = (c.stageDetails ?? {}) as StageDetailsShape;
    const abroad = !isGermany(c.currentCountry);
    const reason =
      REASON_DE[t(s.reasonForLeaving)] ?? t(s.reasonForLeavingOther);
    const holder = t(c.accountHolderName);
    parts.push({
      key: 'application',
      label: provider.applicationForm,
      doc: await fillStageForm({
        provider: mapping.code,
        benefit: mapping.benefit!,
        lastName: t(c.lastName),
        firstName: t(c.firstName),
        addressLine1: t(c.currentAddressLine1),
        addressLine2: t(c.currentAddressLine2) || null,
        postalCode: t(c.currentPostalCode),
        city: abroad
          ? `${t(c.currentCity)}, ${countryDe(c.currentCountry)}`.replace(
              /, $/,
              ''
            )
          : t(c.currentCity),
        dateOfBirth: dateDe(c.dateOfBirth),
        membershipDigits: membershipDigits(c.svNummer),
        stageName: t(s.stageName) || null,
        role: t(s.rolePosition) || null,
        employmentEnd: s.employmentEndDate ? dateDe(s.employmentEndDate) : null,
        permanentlyStopped:
          s.permanentlyStopped === 'yes'
            ? true
            : s.permanentlyStopped === 'no'
              ? false
              : null,
        reasonForStopping: reason || null,
        currentOccupation: t(s.currentOccupation) || null,
        unableToWork:
          s.unableToWorkHealth === 'yes'
            ? true
            : s.unableToWorkHealth === 'no'
              ? false
              : null,
        bankName: t(c.bankName) || null,
        bankCity: t(c.bankCity) || null,
        iban: t(c.iban),
        bic: t(c.swiftBic) || null,
        otherAccountHolder:
          holder && holder.toLowerCase() !== fields.clientFullName.toLowerCase()
            ? holder
            : null,
        signaturePlace: fields.signaturePlace,
        signatureDate: signingDate,
        signaturePng: input.signaturePng,
      }),
    });
  } else {
    parts.push({
      key: 'application',
      label: provider.applicationForm,
      doc: await asDoc(input.providerFormPdf!),
    });
  }

  // 3 Postempfangsvollmacht (one per provider and procedure)
  const pev = await PDFDocument.create();
  await renderProviderPostalAuthority(pev, fields, input.signaturePng);
  parts.push({
    key: 'postal_authority',
    label: `Postempfangsvollmacht für ${fields.agentName}`,
    doc: pev,
  });

  // 4 Passport · 5 extras
  if (input.passportPdf)
    parts.push({
      key: 'id',
      label: 'Kopie des Reisepasses',
      doc: await asDoc(input.passportPdf),
    });
  else warnings.push('No passport/ID copy on file.');
  for (const [i, extra] of input.extraDocuments.entries())
    parts.push({
      key: `extra-${i + 1}`,
      label: extra.label,
      doc: await asDoc(extra.pdf),
    });
  // With an extra on file the tax-ID reminder has served its purpose.
  const shownWarnings = input.extraDocuments.length
    ? warnings.filter((w) => !w.includes('Steuer-Identifikationsnummer'))
    : warnings;

  const anlagen = parts.map((p) => p.label);
  const out = await PDFDocument.create();
  const documents: ProviderPackDocument[] = [];
  const coverPages = await renderProviderCoverLetter(
    out,
    { ...fields, attachmentList: anlagen },
    input.signaturePng
  );
  documents.push({ key: 'cover', label: 'Anschreiben', pages: coverPages });
  for (const p of parts) {
    const pages = await out.copyPages(p.doc, p.doc.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
    documents.push({ key: p.key, label: p.label, pages: pages.length });
  }
  out.setTitle(
    `${provider.label} Beitragserstattung ${t(c.lastName)}, ${t(c.firstName)} – Direktantrag`
  );
  out.setProducer('Atlaes');
  const pdf = await out.save();
  return {
    pdf,
    manifest: {
      route: 'direct',
      kind: 'provider_refund',
      provider: mapping.code,
      benefit: mapping.benefit,
      aktenzeichen: null,
      generatedAt: input.date.toISOString(),
      recipient: {
        carrierName: provider.recipient[0],
        mailingAddress: [...provider.recipient.slice(1), 'Deutschland'],
      },
      postalAgent: input.postalAgent,
      anlagen,
      documents,
      signed,
      signatureDate: signingDate,
      signaturePlace: fields.signaturePlace,
      totalPages: out.getPageCount(),
      warnings: shownWarnings,
    },
  };
}
