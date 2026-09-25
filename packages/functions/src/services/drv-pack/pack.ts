/**
 * DRV submission pack — ONE merged PDF in print order (platform brief
 * 2026-09-16): cover letter → V0901 → A1310 → PoA → A1002 → reply →
 * payslip copy → ID copy, plus any further case documents.
 *
 * Document set rules (client message 21 Sep 2026 + cover-letter spec §4):
 *  - A1002 language by residence (EN default, SP South America/Mexico
 *    except Brazil, PG Brazil/Mozambique)
 *  - reply: Rückantwort for contracting-state nationals; Willenserklärung
 *    (60+ months) for non-contracting nationals with ≥ 60 German months;
 *    nothing otherwise
 *  - Anlagen bullets list exactly what is enclosed; the V0901 stays in the
 *    body sentence and is never a bullet.
 *
 * The assembler is pure with respect to storage: callers pass already
 * loaded PDFs (payslip, ID, Abmeldebestätigung) and receive bytes plus a
 * manifest that the portal stores as the frozen submitted version.
 */

import { PDFDocument } from 'pdf-lib';
import { appendPdfNormalizedToA4 } from '../claim-pdf/normalize-a4';
import {
  buildA1002,
  a1002LanguageForResidence,
  type A1002Language,
} from './a1002-form';
import { fillA1310 } from './a1310-form';
import {
  renderCoverLetter,
  type CoverLetterInput,
  type CoverLetterRecipient,
} from './cover-letter';
import { CONTRACTING_STATES, formatVsnr } from './register';
import type { CarrierResolution } from './resolve-carrier';
import {
  appendRueckantwort,
  renderPoa,
  renderWillenserklaerung,
} from './simple-docs';
import { fillV0901, type Sex, type V0901Defaults } from './v0901-form';

export type ReplyType = 'rueckantwort' | 'willenserklaerung' | 'none';

export function replyTypeFor(
  citizenshipIso: string,
  germanContributionMonths: number
): ReplyType {
  if (CONTRACTING_STATES.has(citizenshipIso.toUpperCase()))
    return 'rueckantwort';
  if (germanContributionMonths >= 60) return 'willenserklaerung';
  return 'none';
}

export interface PackClient {
  vsnr: string;
  lastName: string;
  firstName: string;
  nameAffix?: string | null;
  namePrefix?: string | null;
  title?: string | null;
  birthName?: string | null;
  formerNames?: string | null;
  dateOfBirth: string; // YYYY-MM-DD
  sex: Sex;
  /** Citizenship as written on the form ("indisch"), plus ISO for rules. */
  citizenshipLabel: string;
  citizenshipIso: string;
  placeOfBirth: string;
  street: string;
  addressExtra?: string | null;
  postalCode: string;
  city: string;
  /** Country as written on the forms (e.g. "Indien" / "India"). */
  countryLabel: string;
  residenceIso: string;
  phone?: string | null;
  dateLeftGermany: string; // YYYY-MM-DD
  lastGermanAddress: string;
  passportNumber: string;
  germanContributionMonths: number;
  /** PNG of the client's e-signature; omitted when signing on paper. */
  signaturePng?: Uint8Array | null;
}

export interface PackAttachment {
  /** Anlagen bullet, e.g. "Versicherungsverlauf". */
  label: string;
  pdf: Uint8Array;
}

export interface PackInput {
  aktenzeichen: string;
  date: Date;
  client: PackClient;
  resolution: CarrierResolution;
  /** Lebensbescheinigung enclosed (default true; ops can drop per case). */
  includeLebensbescheinigung?: boolean;
  /** Deregistration certificate when on file. */
  abmeldebestaetigungPdf?: Uint8Array | null;
  payslipPdf?: Uint8Array | null;
  idCopyPdf?: Uint8Array | null;
  extraDocuments?: PackAttachment[];
  v0901Defaults?: Partial<V0901Defaults>;
  /** Override the computed reply document. */
  replyType?: ReplyType;
  /** Override the computed A1002 language. */
  a1002Language?: A1002Language;
  beA?: boolean;
}

export interface PackDocument {
  key: string;
  label: string;
  pages: number;
}

export interface PackManifest {
  aktenzeichen: string;
  generatedAt: string;
  recipient: CoverLetterRecipient;
  anlagen: string[];
  documents: PackDocument[];
  a1002Language: A1002Language;
  replyType: ReplyType;
  totalPages: number;
  warnings: string[];
}

export interface SubmissionPack {
  pdf: Uint8Array;
  manifest: PackManifest;
}

export function recipientFromResolution(
  res: CarrierResolution,
  beA = false
): CoverLetterRecipient {
  if (!res.entry || !res.carrierName) {
    throw new Error(
      `Cannot build a pack without a resolved carrier (rule: ${res.rule})`
    );
  }
  return {
    carrierName: res.carrierName,
    mailingAddress: res.entry.mailingAddress,
    email: res.entry.email,
    beA,
    verbindungsstelleCountryDe: res.viaLiaison ? res.liaisonCountryDe : null,
  };
}

async function appendDoc(out: PDFDocument, src: PDFDocument): Promise<number> {
  const pages = await out.copyPages(src, src.getPageIndices());
  pages.forEach((p) => out.addPage(p));
  return pages.length;
}

async function appendBytes(
  out: PDFDocument,
  bytes: Uint8Array
): Promise<number> {
  const before = out.getPageCount();
  await appendPdfNormalizedToA4(out, bytes);
  return out.getPageCount() - before;
}

export async function buildSubmissionPack(
  input: PackInput
): Promise<SubmissionPack> {
  const c = input.client;
  const warnings: string[] = [];
  const recipient = recipientFromResolution(input.resolution, input.beA);
  if (input.resolution.multiConnection)
    warnings.push(
      'Citizenship and residence point to different liaison offices; recipient was chosen by citizenship.'
    );
  if (input.resolution.implausiblePrefix)
    warnings.push('VSNR prefix looks implausible; check the insurance number.');

  const a1002Language =
    input.a1002Language ?? a1002LanguageForResidence(c.residenceIso);
  const replyType =
    input.replyType ??
    replyTypeFor(c.citizenshipIso, c.germanContributionMonths);
  const includeLeben = input.includeLebensbescheinigung ?? true;

  // Anlagen in the order of the spec §4. The form is A1310: the client's
  // A1310 guide (v1.3, 8 Sep 2026) lists A1312/A1313/A3863 as retired, so
  // the enclosure carries the current number.
  const anlagen: string[] = ['Zahlungserklärung (A1310)'];
  if (includeLeben) anlagen.push('Lebensbescheinigung');
  if (input.abmeldebestaetigungPdf) anlagen.push('Abmeldebestätigung');
  if (replyType !== 'none') anlagen.push('Rückantwort');
  anlagen.push('Kopie des Reisepasses', 'eine auf uns lautende Vollmacht');
  for (const extra of input.extraDocuments ?? []) anlagen.push(extra.label);
  if (!input.idCopyPdf)
    warnings.push(
      'No ID copy attached although "Kopie des Reisepasses" is listed.'
    );

  const out = await PDFDocument.create();
  const documents: PackDocument[] = [];
  const add = async (key: string, label: string, pages: number) =>
    documents.push({ key, label, pages });

  // 1 Cover letter
  const cover: CoverLetterInput = {
    recipient,
    ourRef: input.aktenzeichen,
    date: input.date,
    client: { lastName: c.lastName, firstName: c.firstName },
    vsnr: formatVsnr(c.vsnr),
    anlagen,
  };
  await renderCoverLetter(out, cover);
  await add('cover', 'Anschreiben', 1);

  // 2 V0901
  const v0901 = await fillV0901({
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
    aktenzeichen: input.aktenzeichen,
    date: input.date,
    defaults: input.v0901Defaults,
  });
  await add(
    'v0901',
    'V0901 Antrag auf Beitragserstattung',
    await appendDoc(out, v0901)
  );

  // 3 A1310
  const a1310 = await fillA1310({
    vsnr: c.vsnr,
    lastName: c.lastName,
    firstName: c.firstName,
    street: c.street,
    postalCodeCityCountry: `${c.postalCode} ${c.city}, ${c.countryLabel}`,
    date: input.date,
    clientSignaturePng: c.signaturePng,
  });
  await add('a1310', 'A1310 Zahlungserklärung', await appendDoc(out, a1310));

  // 4 PoA
  const before = out.getPageCount();
  await renderPoa(out, {
    firstName: c.firstName,
    lastName: c.lastName,
    dateOfBirth: c.dateOfBirth,
    passportNumber: c.passportNumber,
    date: input.date,
    clientSignaturePng: c.signaturePng,
  });
  await add('poa', 'Vollmacht', out.getPageCount() - before);

  // 5 A1002
  if (includeLeben) {
    const a1002 = await buildA1002({
      vsnr: c.vsnr,
      lastName: c.lastName,
      firstName: c.firstName,
      dateOfBirth: c.dateOfBirth,
      birthName: c.birthName,
      address: `${c.street}, ${c.postalCode} ${c.city}`,
      country: c.countryLabel,
      language: a1002Language,
    });
    if (a1002.manualFill)
      warnings.push(
        'A1002 (PG) is a scan without form fields and was enclosed blank; fill Part A by hand.'
      );
    await add(
      'a1002',
      `A1002 Lebensbescheinigung (${a1002Language.toUpperCase()})`,
      await appendDoc(out, a1002.doc)
    );
  }

  // 6 Reply
  if (replyType === 'rueckantwort') {
    const b = out.getPageCount();
    await appendRueckantwort(out, {
      vsnr: c.vsnr,
      city: c.city,
      date: input.date,
      clientSignaturePng: c.signaturePng,
    });
    await add('reply', 'Rückantwort', out.getPageCount() - b);
  } else if (replyType === 'willenserklaerung') {
    const b = out.getPageCount();
    await renderWillenserklaerung(out, {
      vsnr: c.vsnr,
      city: c.city,
      date: input.date,
      clientSignaturePng: c.signaturePng,
    });
    await add(
      'reply',
      'Willenserklärung zur Beitragserstattung (60+ Monate)',
      out.getPageCount() - b
    );
  }

  // 7 Abmeldebestätigung · 8 payslip · 9 ID · 10 extras
  if (input.abmeldebestaetigungPdf)
    await add(
      'abmeldung',
      'Abmeldebestätigung',
      await appendBytes(out, input.abmeldebestaetigungPdf)
    );
  if (input.payslipPdf)
    await add(
      'payslip',
      'Kopie Gehaltsabrechnung',
      await appendBytes(out, input.payslipPdf)
    );
  if (input.idCopyPdf)
    await add(
      'id',
      'Kopie des Reisepasses',
      await appendBytes(out, input.idCopyPdf)
    );
  for (const [i, extra] of (input.extraDocuments ?? []).entries()) {
    await add(`extra-${i + 1}`, extra.label, await appendBytes(out, extra.pdf));
  }

  out.setTitle(
    `DRV Beitragserstattung ${c.lastName}, ${c.firstName} – AZ ${input.aktenzeichen}`
  );
  out.setProducer('Atlaes GPR');
  const pdf = await out.save();
  return {
    pdf,
    manifest: {
      aktenzeichen: input.aktenzeichen,
      generatedAt: new Date().toISOString(),
      recipient,
      anlagen,
      documents,
      a1002Language,
      replyType,
      totalPages: out.getPageCount(),
      warnings,
    },
  };
}
