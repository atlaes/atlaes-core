/**
 * Assembles a bAV Abfindung package (client spec section 10): the letter
 * first, then the enclosures in exactly the order the letter's Anlagen list
 * numbers them. PACKAGE_ORDER is the single source for that order; a test
 * checks it against the [[ANLAGEN]] block of each template so the two can
 * never drift apart.
 *
 * Pure: takes bytes, returns bytes. No database or S3 access.
 */

import { PDFDocument } from 'pdf-lib';
import {
  appendImageAsA4Page,
  appendPdfNormalizedToA4,
} from '../claim-pdf/normalize-a4';
import {
  renderLetterPages,
  SIGNATURE_MARKER,
  type RenderLetterOptions,
} from './render-letter';
import type { BavTemplateId } from './templates';

export type BavLetterTemplateId = Exclude<BavTemplateId, 'PEV' | 'VOLL'>;

/** What can follow the letter in a package. */
export type EnclosureKind =
  | 'voll' // Anwaltsvollmacht, rendered from the VOLL template, signed
  | 'pev' // Postempfangsvollmacht, rendered from the PEV template, signed
  | 'passport' // passport copy (claim document role 'passport')
  | 'drv_refund_decision'
  | 'pension_statement'
  | 'provider_form'
  | 'employer_consent'
  | 'employment_end_proof'
  | 'foreign_health_insurance'
  | 'bank_proof';

/** Enclosure order per letter template, mirroring each template's Anlagen list. */
export const PACKAGE_ORDER: Record<
  BavLetterTemplateId,
  readonly EnclosureKind[]
> = {
  'A-LAW': [
    'voll',
    'drv_refund_decision',
    'passport',
    'provider_form',
    'employer_consent',
    'employment_end_proof',
    'pension_statement',
    'foreign_health_insurance',
    'bank_proof',
  ],
  'A-DIRECT': [
    'drv_refund_decision',
    'pev',
    'passport',
    'provider_form',
    'employer_consent',
    'employment_end_proof',
    'pension_statement',
    'foreign_health_insurance',
    'bank_proof',
  ],
  'B-LAW': [
    'voll',
    'pension_statement',
    'passport',
    'provider_form',
    'employer_consent',
    'employment_end_proof',
    'foreign_health_insurance',
    'bank_proof',
  ],
  'B-DIRECT': [
    'pension_statement',
    'pev',
    'passport',
    'provider_form',
    'employer_consent',
    'employment_end_proof',
    'foreign_health_insurance',
    'bank_proof',
  ],
};

/** Enclosures that must be present for the package to be valid. */
export const REQUIRED_ENCLOSURES: Record<
  BavLetterTemplateId,
  readonly EnclosureKind[]
> = {
  'A-LAW': ['voll', 'drv_refund_decision', 'passport'],
  'A-DIRECT': ['drv_refund_decision', 'pev', 'passport'],
  'B-LAW': ['voll', 'pension_statement', 'passport'],
  'B-DIRECT': ['pension_statement', 'pev', 'passport'],
};

export const ENCLOSURE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

export interface EnclosureFile {
  bytes: Uint8Array;
  fileType: string;
}

export interface BavPackageInput {
  templateId: BavLetterTemplateId;
  /** Rendered letter text (template engine output, signature slot = SIGNATURE_MARKER). */
  letterText: string;
  /** Rendered PEV text (DIRECT) or VOLL text (LAW). */
  powerOfAttorneyText?: string;
  signaturePng?: Uint8Array;
  /** LAW letters only. */
  letterheadPdf?: Uint8Array;
  /** Uploaded documents by enclosure kind (passport + claim document roles). */
  files: Partial<Record<Exclude<EnclosureKind, 'voll' | 'pev'>, EnclosureFile>>;
}

export interface BavPackageResult {
  bytes: Uint8Array;
  letterPageCount: number;
  /** Enclosures actually merged, in package order. */
  enclosures: EnclosureKind[];
}

/**
 * Returns the enclosure kinds this package will contain, in order, given
 * which files exist. Throws when a required enclosure is missing.
 */
export function planEnclosures(
  templateId: BavLetterTemplateId,
  available: ReadonlySet<EnclosureKind>
): EnclosureKind[] {
  const missing = REQUIRED_ENCLOSURES[templateId].filter(
    (k) => !available.has(k)
  );
  if (missing.length > 0) {
    throw new Error(
      `Cannot assemble ${templateId} package, missing enclosures: ${missing.join(', ')}`
    );
  }
  return PACKAGE_ORDER[templateId].filter((k) => available.has(k));
}

export async function assembleBavPackage(
  input: BavPackageInput
): Promise<BavPackageResult> {
  const isLaw = input.templateId.endsWith('LAW');
  const available = new Set<EnclosureKind>(
    Object.entries(input.files)
      .filter(([, f]) => !!f)
      .map(([k]) => k as EnclosureKind)
  );
  if (input.powerOfAttorneyText) available.add(isLaw ? 'voll' : 'pev');
  const enclosures = planEnclosures(input.templateId, available);

  if (
    (input.letterText.includes(SIGNATURE_MARKER) ||
      input.powerOfAttorneyText?.includes(SIGNATURE_MARKER)) &&
    !input.signaturePng
  ) {
    throw new Error('Package needs the client signature but none was provided');
  }

  const doc = await PDFDocument.create();

  // 1. The letter (letterhead only on LAW letters).
  const letterOptions: RenderLetterOptions = {
    text: input.letterText,
    signaturePng: input.signaturePng,
    letterheadPdf: isLaw ? input.letterheadPdf : undefined,
  };
  const { pageCount: letterPageCount } = await renderLetterPages(
    doc,
    letterOptions
  );

  // 2+ Enclosures in Anlagen order.
  for (const kind of enclosures) {
    if (kind === 'voll' || kind === 'pev') {
      await renderLetterPages(doc, {
        text: input.powerOfAttorneyText!,
        signaturePng: input.signaturePng,
      });
      continue;
    }
    const file = input.files[kind]!;
    await appendEnclosure(doc, kind, file);
  }

  return { bytes: await doc.save(), letterPageCount, enclosures };
}

async function appendEnclosure(
  doc: PDFDocument,
  kind: EnclosureKind,
  file: EnclosureFile
): Promise<void> {
  if (file.fileType === 'application/pdf') {
    await appendPdfNormalizedToA4(doc, file.bytes);
    return;
  }
  if (ENCLOSURE_IMAGE_TYPES.has(file.fileType)) {
    await appendImageAsA4Page(
      doc,
      file.bytes,
      file.fileType as 'image/png' | 'image/jpeg' | 'image/jpg'
    );
    return;
  }
  throw new Error(
    `Unsupported file type for enclosure ${kind}: ${file.fileType}`
  );
}
