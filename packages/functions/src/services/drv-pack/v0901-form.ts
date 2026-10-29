/**
 * V0901 — "Antrag auf Beitragserstattung bei Aufenthalt im Ausland"
 * (V0901-00, Version 20021-ENG, 14 pages).
 *
 * Field names and the pre-filled values follow the client's annotated copy
 * (V0901_commented.pdf, 21 Sep 2026): the insured person's data in
 * section 2, Vividius as the filing party in section 4 (lawyer, firm and
 * the firm's Aktenzeichen on three lines, per the owner's screenshot of
 * 13 Oct 2026), the escrow account in section 11, "Berlin, <date>" in
 * section 13. The lawyer signs V0901 by hand after downloading the pack
 * (owner, 13 Oct 2026), so no signature image is stamped. Questions 5.1 (record
 * issued / correct) default to "ja", 5.3–8.2 default to "nein" as annotated.
 * The defaults stay fixed, but ops can override 5.1 / 6.1 / 6.3 / 8.1 per
 * case (owner, 20 Oct 2026; v0901-answers.ts, claims.v0901_answers).
 *
 * Claim type is always 1.1 (refund to the insured person). Survivor claims
 * (1.2, sections 3 and 9) are out of scope for the automated pack.
 */

import { PDFDocument, PDFName } from 'pdf-lib';
import { loadGprAsset } from './assets';
import { VIVIDIUS } from './cover-letter';
import { compactVsnr } from './register';
import {
  fieldRect,
  finalizeForm,
  formatDateCompactDe,
  formatDateDe,
  selectButton,
  setTextField,
} from './acroform';
import { V0901_SECTION11_FIELDS, type V0901Section11Field } from './v0901-bank';

export type Sex = 'male' | 'female' | 'none' | 'diverse';

export type RepresentativeCapacity =
  | 'gesetzlicher Vertreter'
  | 'Vormund'
  | 'Betreuer'
  | 'Bevollmächtigter';

export interface V0901Defaults {
  /**
   * Section 4 capacity box. The annotated copy ticks "gesetzlicher
   * Vertreter", but the firm acts under a power of attorney, so the
   * correct capacity is "Bevollmächtigter" (client answers, 15 Sep 2026:
   * the firm signs and submits V0901 under the PoA).
   */
  representativeCapacity: RepresentativeCapacity;
  insuranceRecordIssued: boolean; // 5.1
  insuranceRecordCorrect: boolean; // 5.1 (second question)
  voluntaryContributions: boolean; // 5.3
  childRaisingPeriods: boolean; // 5.4
  foreignContributions: boolean; // 6.1
  residenceInListedCountries: boolean; // 6.2
  currentlyInsuredAbroad: boolean; // 6.3
  voluntaryEuInsurance: boolean; // 6.4
  divorceProceedings: boolean; // 7
  germanBenefitsReceived: boolean; // 8.1
  foreignPension: boolean; // 8.2
}

export const V0901_ANNOTATED_DEFAULTS: V0901Defaults = {
  representativeCapacity: 'Bevollmächtigter',
  insuranceRecordIssued: true,
  insuranceRecordCorrect: true,
  voluntaryContributions: false,
  childRaisingPeriods: false,
  foreignContributions: false,
  residenceInListedCountries: false,
  currentlyInsuredAbroad: false,
  voluntaryEuInsurance: false,
  divorceProceedings: false,
  germanBenefitsReceived: false,
  foreignPension: false,
};

export interface V0901Data {
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
  /** Free text incl. other/former citizenships, e.g. "indisch" / "Indian". */
  citizenship: string;
  placeOfBirth: string; // city, province, state
  street: string; // street + house number
  addressExtra?: string | null;
  postalCodeCity: string;
  country: string;
  phone?: string | null;
  dateLeftGermany: string; // YYYY-MM-DD
  lastGermanAddress: string;
  aktenzeichen: string;
  date: Date;
  defaults?: Partial<V0901Defaults>;
  /**
   * 'direct' (owner spec 29 Oct 2026): section 4 stays empty, section 11
   * carries the client's own account (`bank`), section 13 the client's
   * place and signing date, and the client's signature is stamped on the
   * claimant signature line. Default 'law_firm' keeps the Vividius mapping.
   */
  route?: 'law_firm' | 'direct';
  /** Direct route: every section 11 field (unused ones ''), see v0901-bank. */
  bank?: Record<V0901Section11Field, string>;
  /** Direct route: place of signing (client's residence city). */
  signaturePlace?: string;
  /** Direct route: actual signing date. */
  signatureDate?: Date;
  /** Direct route: the client's online signature (PNG). */
  clientSignaturePng?: Uint8Array | null;
}

/** Section 4 ("Antragstellung durch Dritte") text fields, incl. continuation. */
export const V0901_SECTION4_TEXT_FIELDS = [
  'VERT_N_VN_D_1',
  'VERT_ADR_1',
  'VERT_ADR_ZS_1',
  'VERT_PLZ_1',
  'VERT_ORT_1',
  'TEL_2',
  'FAX_2',
] as const;
export const V0901_SECTION4_BUTTONS = ['AW_EIGENSCHAFT_1'] as const;

/**
 * Claimant signature line on page 14: the row under "Ort, Datum"
 * (VERS_O_DAT_1), same column. Offsets in pt from that field's rect.
 */
export const V0901_SIGNATURE = { gap: 6, height: 26 } as const;

const SEX_EXPORT: Record<Sex, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  none: 'ohne Eintrag',
  diverse: 'divers',
};

const yn = (v: boolean) => (v ? 'ja' : 'nein');

/** Fills all mapped fields in place (pre-flatten). Exported for tests. */
export function fillV0901Fields(doc: PDFDocument, data: V0901Data): void {
  const d: V0901Defaults = {
    ...V0901_ANNOTATED_DEFAULTS,
    ...(data.defaults ?? {}),
  };
  const form = doc.getForm();

  // Header — insurance number (Kennzeichen stays empty: "Not Required").
  setTextField(form, 'PAF_VSNR_trim', compactVsnr(data.vsnr));

  // 1 Type of claim → 1.1
  selectButton(form, 'AW_ANTRAGSART_1', 'Erstattung an Versicherte');

  // 2 Insured person
  setTextField(form, 'Q_PAF_Vers_Name', data.lastName);
  setTextField(form, 'Q_PAF_Vers_Vorname', data.firstName);
  setTextField(form, 'VERS_NZ_1', data.nameAffix ?? '');
  setTextField(form, 'VERS_VORSATZ_1', data.namePrefix ?? '');
  setTextField(form, 'VERS_TITEL_1', data.title ?? '');
  setTextField(form, 'Q_PAF_Vers_GebName', data.birthName ?? '');
  setTextField(form, 'X_PAF_Vers_FrNamen', data.formerNames ?? '');
  setTextField(
    form,
    'Q_PAF_Vers_GebDat_trim',
    formatDateCompactDe(data.dateOfBirth)
  );
  selectButton(form, 'Q_PAF_Vers_Geschlecht', SEX_EXPORT[data.sex]);
  setTextField(form, 'Q_PAF_Vers_Staatsangehörigkeit', data.citizenship);
  setTextField(form, 'Q_PAF_Vers_GebOrt', data.placeOfBirth);
  setTextField(form, 'Q_PAF_Vers_Straße_Postfach', data.street);
  setTextField(form, 'VERS_ADR_ZS', data.addressExtra ?? '');
  setTextField(form, 'Q_PAF_Vers_Ort', data.postalCodeCity);
  setTextField(form, 'Q_PAF_Vers_Land', data.country);
  setTextField(form, 'TEL_1', data.phone ?? '');
  setTextField(
    form,
    'VERS_AUSREISEDAT_1',
    formatDateCompactDe(data.dateLeftGermany)
  );
  setTextField(form, 'VERS_LASTADR_1', data.lastGermanAddress);

  if (data.route === 'direct') {
    fillDirectSections(doc, data);
    return;
  }

  // 4 Claim filed by third parties — lawyer, firm, firm's Aktenzeichen.
  setTextField(
    form,
    'VERT_N_VN_D_1',
    [
      `${VIVIDIUS.lawyerFormal}, ${VIVIDIUS.lawyerTitle}`,
      VIVIDIUS.name,
      `Az. ${data.aktenzeichen}`,
    ].join('\n')
  );
  selectButton(form, 'AW_EIGENSCHAFT_1', d.representativeCapacity);
  setTextField(form, 'VERT_ADR_1', VIVIDIUS.street);
  setTextField(form, 'VERT_PLZ_1', VIVIDIUS.postalCode);
  setTextField(form, 'VERT_ORT_1', VIVIDIUS.city);
  setTextField(form, 'TEL_2', VIVIDIUS.phone);
  setTextField(form, 'FAX_2', VIVIDIUS.email); // as on the annotated copy

  fillAnswerSections(doc, d);

  // 11 Payment → escrow account of the law firm
  // Domestic IBAN field: "DE" is pre-printed, the field holds the 20 digits after it.
  setTextField(form, 'IBAN_1', VIVIDIUS.escrowIbanCompact.slice(2));
  setTextField(form, 'BANK_1', VIVIDIUS.escrowBank);
  setTextField(form, 'KONTO_N_VN_1', VIVIDIUS.name);
  setTextField(
    form,
    'KONTO_ANSCHRIFT_1',
    `${VIVIDIUS.street}, ${VIVIDIUS.postalCode} ${VIVIDIUS.city}`
  );

  // 13 Place, date
  setTextField(
    form,
    'VERS_O_DAT_1',
    `${VIVIDIUS.city}, ${formatDateDe(data.date)}`
  );
}

/** Clears a multi-widget button field (no value, every widget Off). */
function clearButton(doc: PDFDocument, name: string): void {
  const field = doc.getForm().getCheckBox(name);
  field.acroField.dict.set(PDFName.of('V'), PDFName.of('Off'));
  for (const w of field.acroField.getWidgets())
    w.dict.set(PDFName.of('AS'), PDFName.of('Off'));
}

/**
 * Direct route: the client applies personally. Section 4 is cleared
 * completely (no capacity X, no representative), section 11 holds the
 * client's own account in its branch with 11.4 empty, section 13 the
 * client's place and signing date.
 */
function fillDirectSections(doc: PDFDocument, data: V0901Data): void {
  const form = doc.getForm();
  const d: V0901Defaults = {
    ...V0901_ANNOTATED_DEFAULTS,
    ...(data.defaults ?? {}),
  };
  for (const f of V0901_SECTION4_TEXT_FIELDS) setTextField(form, f, '');
  for (const b of V0901_SECTION4_BUTTONS) clearButton(doc, b);

  fillAnswerSections(doc, d);

  if (!data.bank) {
    throw new Error('Direct V0901 needs the client bank mapping (section 11)');
  }
  for (const f of V0901_SECTION11_FIELDS) {
    // 11.4 is never filled for the client's own account.
    const value =
      f === 'KONTO_N_VN_1' || f === 'KONTO_ANSCHRIFT_1' ? '' : data.bank[f];
    setTextField(form, f, value ?? '');
  }

  const place = (data.signaturePlace ?? '').trim();
  if (!place) throw new Error('Direct V0901 needs the place of signing');
  setTextField(
    form,
    'VERS_O_DAT_1',
    `${place}, ${formatDateDe(data.signatureDate ?? data.date)}`
  );
}

/** Sections 5–8 answers (shared by both routes). */
function fillAnswerSections(doc: PDFDocument, d: V0901Defaults): void {
  const form = doc.getForm();
  // 5 German insurance relationship
  selectButton(form, 'AW_VV_1', yn(d.insuranceRecordIssued));
  selectButton(form, 'AW_VV_2', yn(d.insuranceRecordCorrect));
  selectButton(form, 'AW_FRW_BTRGE', yn(d.voluntaryContributions));
  selectButton(form, 'AW_KEZ/BUEZ', yn(d.childRaisingPeriods));

  // 6 Insurance abroad
  selectButton(form, 'AW_BEITR_AUSL_VT', yn(d.foreignContributions));
  selectButton(form, 'AW_AUFENTHALT_AUSL', yn(d.residenceInListedCountries));
  selectButton(form, 'AW_AUSLAND_VP_1', yn(d.currentlyInsuredAbroad));
  selectButton(form, 'AW_AUSLAND_FW_1', yn(d.voluntaryEuInsurance));

  // 7 Divorce · 8 Benefits
  selectButton(form, 'AW_EHESCHEIDUNG', yn(d.divorceProceedings));
  selectButton(form, 'AW_SACH_GELD', yn(d.germanBenefitsReceived));
  selectButton(form, 'AW_AUSLAND_RB_1', yn(d.foreignPension));
}

/**
 * Loads the template, fills it and flattens. On the law-firm route the
 * signature line under "Ort, Datum" stays empty for the lawyer's
 * handwritten signature; on the direct route the client's online
 * signature is stamped there.
 */
export async function fillV0901(data: V0901Data): Promise<PDFDocument> {
  const doc = await PDFDocument.load(loadGprAsset('v0901'));
  fillV0901Fields(doc, data);
  const form = doc.getForm();
  const placeRect = fieldRect(form, 'VERS_O_DAT_1');
  const placePage = doc
    .getPages()
    .findIndex(
      (p) =>
        p.ref === form.getField('VERS_O_DAT_1').acroField.getWidgets()[0].P()
    );
  await finalizeForm(doc);
  if (data.route === 'direct' && data.clientSignaturePng) {
    const page = doc.getPage(
      placePage >= 0 ? placePage : doc.getPageCount() - 1
    );
    const img = await doc.embedPng(data.clientSignaturePng);
    const h = V0901_SIGNATURE.height;
    const w = Math.min(img.width * (h / img.height), placeRect.width + 60);
    page.drawImage(img, {
      x: placeRect.x,
      y: placeRect.y - V0901_SIGNATURE.gap - h,
      width: w,
      height: (w * img.height) / img.width,
    });
  }
  return doc;
}
