/**
 * DRV submission pack for the DIRECT route (owner spec "GPR direct route",
 * 29 Oct 2026) — one merged PDF in print order:
 *
 *   direct cover letter → V0901 → Postempfangsvollmacht → A1002 → reply
 *   (Rückantwort / Willenserklärung) → payslip copy → passport/ID copy →
 *   further evidence (Abmeldebestätigung, extras)
 *
 * No A1310/A1313, no law-firm PoA, no Aktenzeichen, no firm or escrow data
 * anywhere. The client signs the cover letter, V0901, the postal
 * authorization and the reply; A1002 language and the reply type follow
 * the existing rules. The attachment list is generated from the final
 * document list (pack order, cover letter excluded).
 *
 * Pure with respect to storage, like pack.ts.
 */

import { PDFDocument } from 'pdf-lib';
import { appendPdfNormalizedToA4 } from '../claim-pdf/normalize-a4';
import {
  buildA1002,
  a1002LanguageForResidence,
  type A1002Language,
} from './a1002-form';
import { formatDateDe } from './acroform';
import {
  renderDirectCoverLetter,
  type DirectDocFields,
} from './direct-cover-letter';
import {
  recipientFromResolution,
  replyTypeFor,
  type PackAttachment,
  type PackClient,
  type PackDocument,
  type ReplyType,
} from './pack';
import { renderPostalAuthority } from './postal-authority';
import { formatVsnr } from './register';
import type { CarrierResolution } from './resolve-carrier';
import { appendRueckantwort, renderWillenserklaerung } from './simple-docs';
import {
  mapV0901Bank,
  type ClientBankAccount,
  type V0901BankBranch,
} from './v0901-bank';
import { fillV0901, type V0901Defaults } from './v0901-form';
import type { CoverLetterRecipient } from './cover-letter';

/** Postal agent as maintained in Admin settings (ops-settings.ts). */
export interface DirectPostalAgent {
  name: string;
  coLine?: string | null;
  street: string;
  postalCode: string;
  city: string;
}

export interface DirectPackInput {
  date: Date;
  client: PackClient;
  bank: ClientBankAccount;
  resolution: CarrierResolution;
  postalAgent: DirectPostalAgent;
  includeLebensbescheinigung?: boolean;
  abmeldebestaetigungPdf?: Uint8Array | null;
  payslipPdf?: Uint8Array | null;
  idCopyPdf?: Uint8Array | null;
  extraDocuments?: PackAttachment[];
  v0901Defaults?: Partial<V0901Defaults>;
  replyType?: ReplyType;
  a1002Language?: A1002Language;
}

export interface DirectPackManifest {
  route: 'direct';
  /** No AZ on the direct route. */
  aktenzeichen: null;
  generatedAt: string;
  recipient: CoverLetterRecipient;
  postalAgent: DirectPostalAgent;
  /** Attachment list printed on the cover letter (pack order). */
  anlagen: string[];
  documents: PackDocument[];
  a1002Language: A1002Language;
  replyType: ReplyType;
  bankBranch: V0901BankBranch;
  /** True when the client's online signature is stamped on every document. */
  signed: boolean;
  signatureDate: string; // DD.MM.YYYY
  signaturePlace: string;
  totalPages: number;
  warnings: string[];
}

export interface DirectSubmissionPack {
  pdf: Uint8Array;
  manifest: DirectPackManifest;
}

/** Thrown when the direct pack cannot be built from the case data. */
export class DirectPackIncompleteError extends Error {
  constructor(readonly missing: string[]) {
    super(`Direct pack incomplete: ${missing.join(', ')}`);
    this.name = 'DirectPackIncompleteError';
  }
}

export const DIRECT_DOC_LABELS = {
  v0901: 'Antrag auf Beitragserstattung (V0901)',
  postalAuthority: (agent: string) => `Postempfangsvollmacht für ${agent}`,
  a1002: 'Lebensbescheinigung (A1002)',
  rueckantwort: 'Rückantwort zur Beitragserstattung',
  willenserklaerung: 'Willenserklärung zur Beitragserstattung',
  payslip: 'Kopie der Gehaltsabrechnung',
  id: 'Kopie des Reisepasses',
  abmeldung: 'Abmeldebestätigung',
} as const;

/** Client's residential address block: street, supplement, PLZ Ort, country. */
export function residentialAddressLines(c: PackClient): string[] {
  return [
    c.street,
    c.addressExtra ?? '',
    `${c.postalCode} ${c.city}`.trim(),
    c.countryLabel,
  ]
    .map((l) => l.trim())
    .filter(Boolean);
}

/** anna_postal_address: optional c/o line, street, "PLZ Ort" (name separate). */
export function agentAddressLines(a: DirectPostalAgent): string[] {
  return [a.coLine ?? '', a.street, `${a.postalCode} ${a.city}`]
    .map((l) => l.trim())
    .filter(Boolean);
}

export function directDocFields(
  c: PackClient,
  recipient: CoverLetterRecipient,
  agent: DirectPostalAgent,
  signingDate: Date
): DirectDocFields {
  return {
    clientFullName: `${c.firstName.trim()} ${c.lastName.trim()}`,
    clientResidentialAddress: residentialAddressLines(c),
    clientDateOfBirth: formatDateDe(c.dateOfBirth),
    clientVsnr: formatVsnr(c.vsnr),
    drvName: recipient.carrierName,
    drvPostalAddress: [
      ...(recipient.verbindungsstelleCountryDe
        ? [`Verbindungsstelle ${recipient.verbindungsstelleCountryDe}`]
        : []),
      ...recipient.mailingAddress,
    ],
    agentName: agent.name.trim(),
    agentPostalAddress: agentAddressLines(agent),
    signaturePlace: c.city.trim(),
    signatureDate: formatDateDe(signingDate),
  };
}

export async function buildDirectSubmissionPack(
  input: DirectPackInput
): Promise<DirectSubmissionPack> {
  const c = input.client;
  const warnings: string[] = [];
  const recipient = recipientFromResolution(input.resolution, false);
  if (input.resolution.multiConnection)
    warnings.push(
      'Citizenship and residence point to different liaison offices; recipient was chosen by citizenship.'
    );
  if (input.resolution.implausiblePrefix)
    warnings.push('VSNR prefix looks implausible; check the insurance number.');

  const clientName = `${c.firstName} ${c.lastName}`;
  const bank = mapV0901Bank(input.bank, clientName);
  if (bank.missing.length || !bank.branch)
    throw new DirectPackIncompleteError(
      bank.missing.length ? bank.missing : ['client bank account']
    );
  warnings.push(...bank.warnings);

  const signingDate = c.signedAt ?? input.date;
  const signed = !!c.signaturePng;
  if (!signed)
    warnings.push(
      'No online signature from the client: the documents carry empty signature lines and the pack cannot be released.'
    );
  const fields = directDocFields(c, recipient, input.postalAgent, signingDate);

  const a1002Language =
    input.a1002Language ?? a1002LanguageForResidence(c.residenceIso);
  const replyType =
    input.replyType ??
    replyTypeFor(c.citizenshipIso, c.germanContributionMonths);
  const includeLeben = input.includeLebensbescheinigung ?? true;

  // Every document after the cover letter goes into its own PDF first, so
  // the cover letter's attachment list is the final pack content.
  const parts: { key: string; label: string; doc: PDFDocument }[] = [];
  const asDoc = async (bytes: Uint8Array) => {
    const d = await PDFDocument.create();
    await appendPdfNormalizedToA4(d, bytes);
    return d;
  };

  // 2 V0901
  parts.push({
    key: 'v0901',
    label: DIRECT_DOC_LABELS.v0901,
    doc: await fillV0901({
      vsnr: c.vsnr,
      lastName: c.lastName,
      firstName: c.firstName,
      nameAffix: c.nameAffix,
      namePrefix: c.namePrefix,
      title: c.title,
      birthName: c.birthName,
      formerNames: c.formerNames,
      dateOfBirth: c.dateOfBirth,
      sex: c.sex,
      citizenship: c.citizenshipLabel,
      placeOfBirth: c.placeOfBirth,
      street: c.street,
      addressExtra: c.addressExtra,
      postalCodeCity: `${c.postalCode} ${c.city}`,
      country: c.countryLabel,
      phone: c.phone,
      dateLeftGermany: c.dateLeftGermany,
      lastGermanAddress: c.lastGermanAddress,
      aktenzeichen: '',
      date: input.date,
      defaults: { ...(c.v0901Answers ?? {}), ...(input.v0901Defaults ?? {}) },
      route: 'direct',
      bank: bank.fields,
      signaturePlace: fields.signaturePlace,
      signatureDate: signingDate,
      clientSignaturePng: c.signaturePng,
    }),
  });

  // 3 Postempfangsvollmacht
  const pev = await PDFDocument.create();
  await renderPostalAuthority(pev, fields, c.signaturePng);
  parts.push({
    key: 'postal_authority',
    label: DIRECT_DOC_LABELS.postalAuthority(fields.agentName),
    doc: pev,
  });

  // 4 A1002 (existing rules, language by residence)
  if (includeLeben) {
    const a1002 = await buildA1002({
      vsnr: c.vsnr,
      lastName: c.lastName,
      firstName: c.firstName,
      dateOfBirth: c.dateOfBirth,
      birthName: c.birthName,
      placeOfBirth: c.placeOfBirth,
      address: `${c.street}, ${c.postalCode} ${c.city}`,
      country: c.countryLabel,
      language: a1002Language,
    });
    if (a1002.manualFill)
      warnings.push(
        `A1002 (${a1002Language.toUpperCase()}) was enclosed blank; fill Part A by hand.`
      );
    parts.push({
      key: 'a1002',
      label: DIRECT_DOC_LABELS.a1002,
      doc: a1002.doc,
    });
  }

  // 5 Reply (client signature; no representation or escrow wording)
  if (replyType === 'rueckantwort') {
    const d = await PDFDocument.create();
    await appendRueckantwort(d, {
      vsnr: c.vsnr,
      city: c.city,
      date: signingDate,
      clientSignaturePng: c.signaturePng,
    });
    parts.push({ key: 'reply', label: DIRECT_DOC_LABELS.rueckantwort, doc: d });
  } else if (replyType === 'willenserklaerung') {
    const d = await PDFDocument.create();
    await renderWillenserklaerung(d, {
      vsnr: c.vsnr,
      city: c.city,
      date: signingDate,
      clientSignaturePng: c.signaturePng,
    });
    parts.push({
      key: 'reply',
      label: DIRECT_DOC_LABELS.willenserklaerung,
      doc: d,
    });
  }

  // 6 payslip · 7 ID · 8 further evidence
  if (input.payslipPdf)
    parts.push({
      key: 'payslip',
      label: DIRECT_DOC_LABELS.payslip,
      doc: await asDoc(input.payslipPdf),
    });
  else warnings.push('No payslip copy on file.');
  if (input.idCopyPdf)
    parts.push({
      key: 'id',
      label: DIRECT_DOC_LABELS.id,
      doc: await asDoc(input.idCopyPdf),
    });
  else warnings.push('No passport/ID copy on file.');
  if (input.abmeldebestaetigungPdf)
    parts.push({
      key: 'abmeldung',
      label: DIRECT_DOC_LABELS.abmeldung,
      doc: await asDoc(input.abmeldebestaetigungPdf),
    });
  for (const [i, extra] of (input.extraDocuments ?? []).entries())
    parts.push({
      key: `extra-${i + 1}`,
      label: extra.label,
      doc: await asDoc(extra.pdf),
    });

  const anlagen = parts.map((p) => p.label);
  const out = await PDFDocument.create();
  const documents: PackDocument[] = [];

  // 1 Cover letter
  const coverPages = await renderDirectCoverLetter(
    out,
    { ...fields, attachmentList: anlagen },
    c.signaturePng
  );
  documents.push({ key: 'cover', label: 'Anschreiben', pages: coverPages });

  for (const p of parts) {
    const pages = await out.copyPages(p.doc, p.doc.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
    documents.push({ key: p.key, label: p.label, pages: pages.length });
  }

  out.setTitle(
    `DRV Beitragserstattung ${c.lastName}, ${c.firstName} – Direktantrag`
  );
  out.setProducer('Atlaes GPR');
  const pdf = await out.save();
  return {
    pdf,
    manifest: {
      route: 'direct',
      aktenzeichen: null,
      generatedAt: new Date().toISOString(),
      recipient,
      postalAgent: input.postalAgent,
      anlagen,
      documents,
      a1002Language,
      replyType,
      bankBranch: bank.branch,
      signed,
      signatureDate: fields.signatureDate,
      signaturePlace: fields.signaturePlace,
      totalPages: out.getPageCount(),
      warnings,
    },
  };
}
