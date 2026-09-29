/**
 * A1310 — "Zahlungserklärung / Declaration concerning Payment"
 * (A1310-00, Version 08008-ENG, 2 pages).
 *
 * Pre-filled per the annotated copy: beneficiary name and address, the
 * Vividius escrow IBAN as a EURO account, "ONLY for EU bank accounts: I am
 * not the account holder", Vividius as the person receiving benefits
 * (section 3). Two signatures: the client (beneficiary, X_DAT_1) and the
 * lawyer (person receiving benefits, X_DAT_4).
 *
 * The client's message and the PoA still call this form "A1313"; the file
 * delivered is A1310 and the client's own A1310 guide (8 Sep 2026) lists
 * A1313 as retired — the cover-letter bullet therefore says "(A1310)"; the
 * owner confirms.
 */

import { PDFDocument } from 'pdf-lib';
import { loadGprAsset } from './assets';
import { VIVIDIUS } from './cover-letter';
import { compactVsnr } from './register';
import {
  fieldRect,
  finalizeForm,
  formatDateDe,
  selectButton,
  setTextField,
  tick,
} from './acroform';

export interface A1310Data {
  vsnr: string;
  lastName: string;
  firstName: string;
  street: string;
  /** "Postal code, place of residence, state, country" as one line. */
  postalCodeCityCountry: string;
  date: Date;
  clientSignaturePng?: Uint8Array | null;
  lawyerSignaturePng?: Uint8Array;
}

export function fillA1310Fields(doc: PDFDocument, data: A1310Data): void {
  const form = doc.getForm();
  setTextField(form, 'PAF_VSNR_trim', compactVsnr(data.vsnr));
  setTextField(form, 'BER_N_VN_1', `${data.lastName}, ${data.firstName}`);
  setTextField(form, 'BER_ADR_1', data.street);
  setTextField(form, 'BER_PLZ_ORT_LAND_1', data.postalCodeCityCountry);

  // 1 Bank account details — escrow, EURO account
  setTextField(form, 'X_IBAN_1', VIVIDIUS.escrowIban);
  setTextField(form, 'X_KONTO_N_SITZ_1', VIVIDIUS.escrowBank);
  tick(form, 'AW_EURO');

  // 2 Account holder → "nicht innehabende Person" (EU account, not the holder)
  selectButton(form, 'X_AW_KONTO', 'nicht innehabende Person');

  // 3 Person receiving benefits → Vividius
  setTextField(form, 'X_KONTO_N_VN_FM', VIVIDIUS.name);
  setTextField(form, 'X_KONTO_STR_NR', VIVIDIUS.street);
  setTextField(
    form,
    'X_KONTO_WO_PLZ_LAND',
    `${VIVIDIUS.postalCode} ${VIVIDIUS.city}`
  );

  // Dates: client (1) and person receiving benefits (4)
  const date = formatDateDe(data.date);
  setTextField(form, 'X_DAT_1', date);
  setTextField(form, 'X_DAT_4', date);
}

export async function fillA1310(data: A1310Data): Promise<PDFDocument> {
  const doc = await PDFDocument.load(loadGprAsset('a1310'));
  fillA1310Fields(doc, data);

  // Signatures go on the line to the right of the date field, above the label.
  const form = doc.getForm();
  const page2 = doc.getPages()[1];
  const height = 24;

  const lawyerRect = fieldRect(form, 'X_DAT_4');
  const lawyer = await doc.embedPng(
    data.lawyerSignaturePng ?? loadGprAsset('signature')
  );
  page2.drawImage(lawyer, {
    x: lawyerRect.x + lawyerRect.width + 14,
    y: lawyerRect.y + 1,
    width: lawyer.width * (height / lawyer.height),
    height,
  });

  if (data.clientSignaturePng) {
    const clientRect = fieldRect(form, 'X_DAT_1');
    const client = await doc.embedPng(data.clientSignaturePng);
    page2.drawImage(client, {
      x: clientRect.x + clientRect.width + 14,
      y: clientRect.y + 1,
      width: client.width * (height / client.height),
      height,
    });
  }

  await finalizeForm(doc);
  return doc;
}
