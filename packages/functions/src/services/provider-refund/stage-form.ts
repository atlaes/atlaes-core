/**
 * Fills the VddB / VddKO "Antrag auf Beitragserstattung / Rückgewähr"
 * (Stand 03/2026, Version 2; AcroForm, 2 pages) from the case and stamps
 * the client's online signature in field 29. Flattened afterwards.
 *
 * The forms use checkbox fields with several widgets as radio groups,
 * whose export values are Latin-1 PDF names (some double-encoded, e.g.
 * "#232f" for "/"). pdf-lib's check() only knows the first widget's
 * value, so a choice is made by writing the matching widget's own on-name
 * to /V (as selectButtonExport does for the L203).
 */

import fs from 'fs';
import path from 'path';
import { PDFDict, PDFDocument, PDFName, StandardFonts } from 'pdf-lib';
import type { PDFForm } from 'pdf-lib';
import { resolveStreetAndHouseNumber } from '../claim-pdf/l203-form';
import { STAGE_BENEFIT_INFO, type StageBenefit } from './providers';

export type StageProvider = 'VddB' | 'VddKO';

export interface StageFormData {
  provider: StageProvider;
  benefit: StageBenefit;
  lastName: string;
  firstName: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  /** City, with the German country name for addresses abroad. */
  city: string;
  dateOfBirth: string; // DD.MM.YYYY
  /** Digits after the printed "J/B–" / "J/O–" prefix (max 6). */
  membershipDigits: string | null;
  stageName: string | null;
  role: string | null;
  employmentEnd: string | null; // DD.MM.YYYY
  /** Field 18: stage work given up for good. */
  permanentlyStopped: boolean | null;
  reasonForStopping: string | null;
  currentOccupation: string | null;
  unableToWork: boolean | null;
  bankName: string | null;
  bankCity: string | null;
  iban: string;
  bic: string | null;
  /** Set when the account is not the client's own. */
  otherAccountHolder: string | null;
  signaturePlace: string;
  signatureDate: string; // DD.MM.YYYY
  signaturePng: Uint8Array | null;
}

const ASSET = { VddB: 'vddb-antrag.pdf', VddKO: 'vddko-antrag.pdf' } as const;

function resolveAsset(fileName: string): string {
  // Bundled: dist/assets/provider-refund; dev/vitest: src/assets/provider-refund.
  let p = path.join(__dirname, 'assets', 'provider-refund', fileName);
  if (!fs.existsSync(p))
    p = path.join(__dirname, '..', '..', 'assets', 'provider-refund', fileName);
  return p;
}

export function loadStageFormTemplate(provider: StageProvider): Buffer {
  return fs.readFileSync(resolveAsset(ASSET[provider]));
}

/** Field names that differ between the two forms. */
const NAMES = {
  VddB: {
    employer: 'Name der Bühne',
    stopped: 'Aufgabe Bühnentätigkeit im Anstaltenbereich',
  },
  VddKO: {
    employer: 'Name des Kulturorchesters',
    stopped: 'Aufgabe Kulturorchestermusiker im Anstaltenbereich',
  },
} as const;

/** A PDF name's text with #xx escapes decoded twice (Latin-1). */
function decodeName(raw: string): string {
  const once = (s: string) =>
    s.replace(/#([0-9a-fA-F]{2})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
  return once(once(raw.replace(/^\//, '')));
}

/**
 * Selects the widget of a checkbox group whose on-value reads `label`
 * (decoded). Throws when no widget matches, so a wording change in a new
 * form version cannot silently leave the box empty.
 */
export function selectWidget(form: PDFForm, field: string, label: string) {
  const cb = form.getCheckBox(field);
  const ctx = form.doc.context;
  // The normal appearance may be an indirect dict (getOnValue() then
  // returns nothing), so read its keys through the context.
  const ons = cb.acroField
    .getWidgets()
    .map((w) => {
      const ap = ctx.lookupMaybe(w.dict.get(PDFName.of('AP')), PDFDict);
      const normal = ap && ctx.lookupMaybe(ap.get(PDFName.of('N')), PDFDict);
      return normal?.keys().find((k) => k !== PDFName.of('Off'));
    })
    .filter((v): v is PDFName => v !== undefined);
  const hit = ons.find((n) => decodeName(n.asString()).startsWith(label));
  if (!hit)
    throw new Error(
      `No option "${label}" on "${field}" (have: ${ons
        .map((n) => decodeName(n.asString()))
        .join(' | ')})`
    );
  cb.acroField.dict.set(PDFName.of('V'), hit);
}

/**
 * Ticks "nein" or "ja" on a two-box row by position: on every row of this
 * form "nein" is the left box and "ja" the right one. Field 20's export
 * values are swapped in the template (the box next to "nein" exports
 * "ja"), so the export value cannot be trusted here.
 */
export function selectYesNo(form: PDFForm, field: string, yes: boolean) {
  const cb = form.getCheckBox(field);
  const ctx = form.doc.context;
  const boxes = cb.acroField
    .getWidgets()
    .map((w) => {
      const ap = ctx.lookupMaybe(w.dict.get(PDFName.of('AP')), PDFDict);
      const normal = ap && ctx.lookupMaybe(ap.get(PDFName.of('N')), PDFDict);
      const on = normal?.keys().find((k) => k !== PDFName.of('Off'));
      return { x: w.getRectangle().x, on };
    })
    .filter((b): b is { x: number; on: PDFName } => b.on !== undefined)
    .sort((a, b) => a.x - b.x);
  if (boxes.length !== 2)
    throw new Error(`"${field}" has ${boxes.length} boxes, expected 2`);
  cb.acroField.dict.set(PDFName.of('V'), boxes[yes ? 1 : 0].on);
}

/** Field 2 holds 6 characters after the printed prefix. */
export function membershipDigits(
  value: string | null | undefined
): string | null {
  const v = (value ?? '').replace(/\s+/g, '');
  if (!v) return null;
  const tail = v.replace(/^[A-Za-z]\/?[A-Za-z]?[-–]?/, '');
  return /^\d{1,6}$/.test(tail) ? tail : null;
}

/** Fills and flattens the form; returns the 2-page document. */
export async function fillStageForm(data: StageFormData): Promise<PDFDocument> {
  const doc = await PDFDocument.load(loadStageFormTemplate(data.provider));
  const form = doc.getForm();
  const n = NAMES[data.provider];
  const set = (field: string, value: string | null | undefined) => {
    const v = (value ?? '').trim();
    if (v) form.getTextField(field).setText(v);
  };

  selectWidget(
    form,
    'Antragsgrund',
    STAGE_BENEFIT_INFO[data.benefit].formValue
  );
  set('Unser Zeichen / Ihre Versicherungsnummer', data.membershipDigits);
  set('Nachname', data.lastName);
  set('Vorname', data.firstName);
  const { street, houseNumber } = resolveStreetAndHouseNumber(
    data.addressLine1,
    data.addressLine2
  );
  set('Straßenname', street);
  set('Hausnummer', houseNumber);
  set('Postleitzahl', data.postalCode);
  set('Wohnort', data.city);
  set('Geburtsdatum', data.dateOfBirth);

  set(n.employer, data.stageName);
  set('Name der Tätigkeit', data.role);
  set('Ende der Tätigkeit', data.employmentEnd);
  if (data.permanentlyStopped !== null) {
    selectYesNo(form, n.stopped, data.permanentlyStopped);
    if (data.permanentlyStopped) {
      set('Bühnentätigkeit aufgegeben seit', data.employmentEnd);
      set('Gründe endgültige Aufgabe Tätigkeit', data.reasonForStopping);
    }
  }
  set('Aktuelle Tätigkeit', data.currentOccupation);
  if (data.unableToWork !== null)
    selectYesNo(form, 'Berufs- oder erwerbsunfähig', data.unableToWork);
  // Field 21: a "yes" stops the client's application flow (Confirm step,
  // "other institution insurance"), so a submitted claim is always "nein".
  selectYesNo(
    form,
    'Pflichtversicherung bei anderer Zusatzversorgungseinrichtung',
    false
  );

  set('Name des Kreditinstituts', data.bankName);
  set('Ort / Sitz des Kreditinstituts', data.bankCity);
  set('IBAN', data.iban.replace(/\s+/g, ''));
  set('BIC', data.bic);
  if (data.otherAccountHolder) {
    selectWidget(form, 'Kontoinhaber', 'anderer Kontoinhaber');
    set('Name des Kontoinhabers', data.otherAccountHolder);
  } else {
    selectWidget(form, 'Kontoinhaber', 'Antragsteller');
  }

  set('Ort der Unterschrift', data.signaturePlace);
  set('Datum der Unterschrift', data.signatureDate);

  if (data.signaturePng) {
    // Field 29 "Unterschrift": the line right of the label, below 27/28.
    const img = await doc.embedPng(data.signaturePng);
    const scale = Math.min(30 / img.height, 150 / img.width);
    doc.getPages()[1].drawImage(img, {
      x: 145,
      y: 133,
      width: img.width * scale,
      height: img.height * scale,
    });
  }

  form.updateFieldAppearances(await doc.embedFont(StandardFonts.Helvetica));
  form.flatten();
  return doc;
}
