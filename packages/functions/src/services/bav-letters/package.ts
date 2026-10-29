/**
 * Plans and assembles a bAV submission pack (owner spec 29 Oct 2026,
 * "Submission document list"):
 *
 *   1  cover letter (route × status)
 *   2  authority: Postempfangsvollmacht (direct) or Vollmacht (law firm),
 *      signed by the client
 *   3  DRV refund decision: required for Vested, otherwise where uploaded
 *   4  passport copy
 *   5+ recipient-specific forms and evidence on the claim, then the
 *      documents ops appended ('bav_extra', upload order)
 *
 * The cover letter's attachment_list is generated from the same plan, so
 * the list and the merged pack cannot drift apart.
 *
 * Pure: takes bytes, returns bytes. No database or S3 access.
 */

import { PDFDocument } from 'pdf-lib';
import type { ClaimDocumentRole } from '../../drizzle/schema/claims';
import {
  appendImageAsA4Page,
  appendPdfNormalizedToA4,
} from '../claim-pdf/normalize-a4';
import {
  renderLetterPages,
  SIGNATURE_MARKER,
  type RenderLetterOptions,
} from './render-letter';

/** What can follow the cover letter in a pack. */
export type EnclosureKind =
  | 'voll' // Vollmacht for the law firm, rendered from VOLL, signed
  | 'pev' // Postempfangsvollmacht, rendered from PEV, signed
  | 'drv_refund_decision'
  | 'passport'
  | 'provider_form'
  | 'pension_statement'
  | 'employer_consent'
  | 'employment_end_proof'
  | 'foreign_health_insurance'
  | 'bank_proof'
  | 'bav_extra'; // ops-attached document, any number

/** Enclosures that are claim documents (one per role, latest upload). */
export type DocumentEnclosureKind = Exclude<
  EnclosureKind,
  'voll' | 'pev' | 'bav_extra'
>;

/** Pack order after the cover letter; extras follow. */
export const PACK_ORDER: readonly EnclosureKind[] = [
  'pev',
  'voll',
  'drv_refund_decision',
  'passport',
  'provider_form',
  'pension_statement',
  'employer_consent',
  'employment_end_proof',
  'foreign_health_insurance',
  'bank_proof',
  'bav_extra',
];

export interface PlannedEnclosure {
  kind: EnclosureKind;
  /** German line in the attachment list (without the number). */
  label: string;
  /** Index into the plan's `documents`; absent for the authority. */
  documentIndex?: number;
}

export interface PackPlanInput {
  authority: 'pev' | 'voll';
  status: 'vested' | 'non_vested' | null;
  /** DD.MM.YYYY or ''. */
  drvDecisionDate: string;
  providerFormTitle: string;
  statementType: string;
  /** DD.MM.YYYY or ''. */
  statementDate: string;
  documents: readonly { role: ClaimDocumentRole; fileName: string }[];
}

function stripExtension(fileName: string): string {
  const base = fileName.trim().replace(/\.[a-z0-9]{1,5}$/i, '');
  return base.replace(/[_]+/g, ' ').trim() || 'Weitere Unterlage';
}

function labelFor(
  kind: EnclosureKind,
  input: PackPlanInput,
  fileName: string
): string {
  switch (kind) {
    case 'pev':
      return 'Postempfangsvollmacht';
    case 'voll':
      return 'Vollmacht';
    case 'drv_refund_decision':
      return input.drvDecisionDate
        ? `Erstattungsbescheid der Deutschen Rentenversicherung vom ${input.drvDecisionDate}`
        : 'Erstattungsbescheid der Deutschen Rentenversicherung';
    case 'passport':
      return 'Kopie des Reisepasses';
    case 'provider_form':
      return input.providerFormTitle
        ? `Antragsformular „${input.providerFormTitle}“`
        : 'Antragsformular';
    case 'pension_statement':
      return input.statementType
        ? `${input.statementType}${input.statementDate ? ` vom ${input.statementDate}` : ''}`
        : 'Standmitteilung';
    case 'employer_consent':
      return 'Erklärung des ehemaligen Arbeitgebers';
    case 'employment_end_proof':
      return 'Nachweis über die Beendigung des Arbeitsverhältnisses';
    case 'foreign_health_insurance':
      return 'Nachweis der Krankenversicherung';
    case 'bank_proof':
      return 'Nachweis der Bankverbindung';
    case 'bav_extra':
      return stripExtension(fileName);
  }
}

/**
 * The pack after the cover letter, in order, and what is missing for it.
 * `documents` holds at most one entry per role except 'bav_extra'.
 */
export function planBavPack(input: PackPlanInput): {
  enclosures: PlannedEnclosure[];
  missing: string[];
} {
  const missing: string[] = [];
  const indexByRole = new Map<string, number>();
  input.documents.forEach((d, i) => {
    if (d.role !== 'bav_extra' && !indexByRole.has(d.role))
      indexByRole.set(d.role, i);
  });
  if (!indexByRole.has('passport')) {
    missing.push('Passport copy is required');
  }
  if (input.status === 'vested' && !indexByRole.has('drv_refund_decision')) {
    missing.push(
      'DRV refund decision (Erstattungsbescheid) is required for Vested letters'
    );
  }

  const enclosures: PlannedEnclosure[] = [];
  for (const kind of PACK_ORDER) {
    if (kind === 'pev' || kind === 'voll') {
      if (kind === input.authority) {
        enclosures.push({ kind, label: labelFor(kind, input, '') });
      }
      continue;
    }
    if (kind === 'bav_extra') {
      input.documents.forEach((d, i) => {
        if (d.role === 'bav_extra') {
          enclosures.push({
            kind,
            label: labelFor(kind, input, d.fileName),
            documentIndex: i,
          });
        }
      });
      continue;
    }
    const index = indexByRole.get(kind);
    if (index !== undefined) {
      enclosures.push({
        kind,
        label: labelFor(kind, input, input.documents[index].fileName),
        documentIndex: index,
      });
    }
  }
  return { enclosures, missing };
}

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
  /** Rendered cover letter (signature slot = SIGNATURE_MARKER on direct letters). */
  letterText: string;
  /** Rendered PEV (direct) or VOLL (law firm). */
  authorityText: string;
  /** Planned enclosures (authority included) in pack order. */
  enclosures: readonly PlannedEnclosure[];
  /** Downloaded document files by `documentIndex`. */
  files: ReadonlyMap<number, EnclosureFile>;
  signaturePng?: Uint8Array;
  /** Law-firm letters only. */
  letterheadPdf?: Uint8Array;
  /** Subject line set in bold (the configurable non-vested title). */
  subjectLine?: string;
  /** Lines set in the small sender font (law-firm sender line). */
  smallLines?: readonly string[];
}

export interface BavPackageResult {
  bytes: Uint8Array;
  letterPageCount: number;
  /** Enclosures actually merged, in pack order. */
  enclosures: EnclosureKind[];
}

export async function assembleBavPackage(
  input: BavPackageInput
): Promise<BavPackageResult> {
  if (
    (input.letterText.includes(SIGNATURE_MARKER) ||
      input.authorityText.includes(SIGNATURE_MARKER)) &&
    !input.signaturePng
  ) {
    throw new Error('Package needs the client signature but none was provided');
  }

  const doc = await PDFDocument.create();

  // 1. Cover letter (letterhead only on law-firm letters).
  const letterOptions: RenderLetterOptions = {
    text: input.letterText,
    signaturePng: input.signaturePng,
    letterheadPdf: input.letterheadPdf,
    subjectLine: input.subjectLine,
    smallLines: input.smallLines,
  };
  const { pageCount: letterPageCount } = await renderLetterPages(
    doc,
    letterOptions
  );

  // 2+ Enclosures in pack order.
  const merged: EnclosureKind[] = [];
  for (const enclosure of input.enclosures) {
    if (enclosure.kind === 'pev' || enclosure.kind === 'voll') {
      await renderLetterPages(doc, {
        text: input.authorityText,
        signaturePng: input.signaturePng,
      });
      merged.push(enclosure.kind);
      continue;
    }
    const file =
      enclosure.documentIndex !== undefined
        ? input.files.get(enclosure.documentIndex)
        : undefined;
    if (!file) {
      throw new Error(
        `Cannot assemble bAV package: file for ${enclosure.kind} is missing`
      );
    }
    await appendEnclosure(doc, enclosure.kind, file);
    merged.push(enclosure.kind);
  }

  return { bytes: await doc.save(), letterPageCount, enclosures: merged };
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
