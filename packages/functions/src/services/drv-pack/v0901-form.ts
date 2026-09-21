/**
 * V0901 — "Antrag auf Beitragserstattung bei Aufenthalt im Ausland"
 * (V0901-00, Version 20021-ENG, 14 pages).
 *
 * Field names and the pre-filled values follow the client's annotated copy
 * (V0901_commented.pdf, 21 Sep 2026): the insured person's data in
 * section 2, Vividius as the filing party in section 4, the escrow account
 * in section 11, "Berlin, <date>" in section 13. Questions 5.1 (record
 * issued / correct) default to "ja", 5.3–8.2 default to "nein" as annotated;
 * every default is overridable through `V0901Defaults` because the owner
 * still has to confirm whether 5.1 / 6.1 / 6.3 / 8.1 are data-driven.
 *
 * Claim type is always 1.1 (refund to the insured person). Survivor claims
 * (1.2, sections 3 and 9) are out of scope for the automated pack.
 */

import { PDFDocument } from 'pdf-lib';
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

export type Sex = 'male' | 'female' | 'none' | 'diverse';

export type RepresentativeCapacity =
  | 'gesetzlicher Vertreter'
  | 'Vormund'
  | 'Betreuer'
  | 'Bevollmächtigter';

export interface V0901Defaults {
  /** Section 4 capacity box. Annotated copy ticks "gesetzlicher Vertreter". */
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
  representativeCapacity: 'gesetzlicher Vertreter',
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
  /** Lawyer's signature image (PNG) — defaults to the Vividius asset. */
  lawyerSignaturePng?: Uint8Array;
}

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

  // 4 Claim filed by third parties — Vividius (annotated values).
  setTextField(
    form,
    'VERT_N_VN_D_1',
    `${VIVIDIUS.name}, AZ ${data.aktenzeichen}`
  );
  selectButton(form, 'AW_EIGENSCHAFT_1', d.representativeCapacity);
  setTextField(form, 'VERT_ADR_1', VIVIDIUS.street);
  setTextField(form, 'VERT_PLZ_1', VIVIDIUS.postalCode);
  setTextField(form, 'VERT_ORT_1', VIVIDIUS.city);
  setTextField(form, 'TEL_2', VIVIDIUS.phone);
  setTextField(form, 'FAX_2', VIVIDIUS.email); // as on the annotated copy

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

/** Loads the template, fills it, stamps the lawyer's signature, flattens. */
export async function fillV0901(data: V0901Data): Promise<PDFDocument> {
  const doc = await PDFDocument.load(loadGprAsset('v0901'));
  fillV0901Fields(doc, data);

  // Signature row sits directly under "Ort, Datum" on page 14.
  const form = doc.getForm();
  const rect = fieldRect(form, 'VERS_O_DAT_1');
  const sig = await doc.embedPng(
    data.lawyerSignaturePng ?? loadGprAsset('signature')
  );
  const height = 26;
  const page = doc.getPages()[13];
  page.drawImage(sig, {
    x: rect.x + 4,
    y: rect.y - height - 3,
    width: sig.width * (height / sig.height),
    height,
  });

  await finalizeForm(doc);
  return doc;
}
