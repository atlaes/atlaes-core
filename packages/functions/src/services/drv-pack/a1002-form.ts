/**
 * A1002 — "Lebens- und Staatsangehörigkeitsbescheinigung / Certificate of
 * Life and Nationality". Part A is pre-filled by the platform; Part B is
 * stamped by an authority in the client's country of residence, so the
 * date and signature in A3 stay empty.
 *
 * Language by residence (client rule): EN default; SP for South America and
 * Mexico (except Brazil); PG for Brazil and Mozambique. The Spanish file is
 * an AcroForm; the English file is flat (text overlay at measured label
 * positions); the Portuguese file is a scan without a text layer — it is
 * included blank and flagged `manualFill` until a fillable original arrives.
 */

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { loadGprAsset } from './assets';
import { compactVsnr } from './register';
import {
  drawComb,
  finalizeForm,
  formatDateCompactDe,
  setTextField,
} from './acroform';

export type A1002Language = 'en' | 'sp' | 'pg';

const SPANISH_RESIDENCE = new Set([
  'AR',
  'BO',
  'CL',
  'CO',
  'EC',
  'GY',
  'PY',
  'PE',
  'SR',
  'UY',
  'VE',
  'MX',
  'GF',
]);
const PORTUGUESE_RESIDENCE = new Set(['BR', 'MZ']);

export function a1002LanguageForResidence(residenceIso: string): A1002Language {
  const iso = residenceIso.toUpperCase();
  if (PORTUGUESE_RESIDENCE.has(iso)) return 'pg';
  if (SPANISH_RESIDENCE.has(iso)) return 'sp';
  return 'en';
}

export interface A1002Data {
  vsnr: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string; // YYYY-MM-DD
  birthName?: string | null;
  address: string; // street + postal code + city on one line
  country: string;
  language: A1002Language;
}

export interface A1002Result {
  doc: PDFDocument;
  language: A1002Language;
  /** True when the template could not be filled (PG scan). */
  manualFill: boolean;
}

/**
 * Measured on a1002-en.pdf (A4, top-origin pt): the VSNR comb has 12 cells
 * of 19.85 pt starting at x 116.2 (cells 1–3 are the PANR, left empty);
 * the date-of-birth comb has 8 cells of 19.95 pt from x 393.2.
 */
const EN_LAYOUT = {
  vsnrComb: { left: 116.2, cell: 19.85, baselineTop: 106, size: 10 },
  dobComb: { left: 393.2, cell: 19.95, baselineTop: 166, size: 10 },
  name: { x: 90, yTop: 165 },
  birthName: { x: 430, yTop: 176 },
  address: { x: 172, yTop: 207 },
  country: { x: 172, yTop: 236 },
  size: 10,
} as const;

async function fillSpanish(data: A1002Data): Promise<PDFDocument> {
  const doc = await PDFDocument.load(loadGprAsset('a1002Sp'));
  const form = doc.getForm();
  const c = compactVsnr(data.vsnr);
  const m = /^(\d{2})(\d{6})([A-Z])(\d{3})$/.exec(c);
  if (m) {
    setTextField(form, 'PRNR_1', m[1]);
    setTextField(form, 'PRNR_2', m[2]);
    setTextField(form, 'PRNR_3', m[3]);
    setTextField(form, 'PRNR_4', m[4]);
  } else {
    setTextField(form, 'PRNR_2', c);
  }
  setTextField(form, 'Name Vorname', `${data.lastName}, ${data.firstName}`);
  setTextField(form, 'Geburtsdatum', formatDateCompactDe(data.dateOfBirth)); // 8-char comb
  setTextField(form, 'Geburtsname', data.birthName ?? '');
  setTextField(form, 'Anschrift', data.address);
  setTextField(form, 'Land', data.country);
  await finalizeForm(doc);
  return doc;
}

async function fillEnglish(data: A1002Data): Promise<PDFDocument> {
  const doc = await PDFDocument.load(loadGprAsset('a1002En'));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPages()[0];
  const h = page.getHeight();
  const draw = (text: string, pos: { x: number; yTop: number }) =>
    page.drawText(text, {
      x: pos.x,
      y: h - pos.yTop - font.heightAtSize(EN_LAYOUT.size, { descender: false }),
      size: EN_LAYOUT.size,
      font,
    });
  drawComb(page, font, compactVsnr(data.vsnr), EN_LAYOUT.vsnrComb);
  draw(`${data.lastName}, ${data.firstName}`, EN_LAYOUT.name);
  drawComb(
    page,
    font,
    formatDateCompactDe(data.dateOfBirth),
    EN_LAYOUT.dobComb
  );
  if (data.birthName) draw(data.birthName, EN_LAYOUT.birthName);
  draw(data.address, EN_LAYOUT.address);
  draw(data.country, EN_LAYOUT.country);
  return doc;
}

export async function buildA1002(data: A1002Data): Promise<A1002Result> {
  if (data.language === 'sp') {
    return { doc: await fillSpanish(data), language: 'sp', manualFill: false };
  }
  if (data.language === 'pg') {
    return {
      doc: await PDFDocument.load(loadGprAsset('a1002Pg')),
      language: 'pg',
      manualFill: true,
    };
  }
  return { doc: await fillEnglish(data), language: 'en', manualFill: false };
}
