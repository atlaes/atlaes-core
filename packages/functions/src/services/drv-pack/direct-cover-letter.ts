/**
 * Direct-route cover letter (GPR_Direct_Route_Cover_Letter_DE.docx, owner
 * spec 29 Oct 2026). Written in the client's first person and signed by
 * the client: no letterhead, no Aktenzeichen, no lawyer signature, no
 * escrow wording. Addressed to the responsible DRV office from the
 * existing routing (resolveCarrier + address override). Anna Kliem (the
 * configured postal agent) is named only for receiving post; the bank
 * details stay in V0901 and are not repeated here.
 *
 * Placeholders: client_full_name, client_residential_address (multiline,
 * incl. country), client_date_of_birth (DD.MM.YYYY), client_vsnr,
 * drv_name, drv_postal_address, anna_postal_address, signature_place,
 * signature_date, attachment_list (final pack order, cover excluded).
 */

import { PDFDocument, PDFFont } from 'pdf-lib';
import { A4 } from '../claim-pdf/constants';
import {
  assertResolved,
  DIRECT_LAYOUT,
  directFonts,
  FlowWriter,
  renderDirectPlan,
  type DirectOp,
} from './direct-layout';

/** Values of the direct-route template placeholders, already formatted. */
export interface DirectDocFields {
  clientFullName: string;
  /** Street, optional supplement, "PLZ Ort", country — one entry per line. */
  clientResidentialAddress: string[];
  clientDateOfBirth: string; // DD.MM.YYYY
  clientVsnr: string; // letters and leading zeros preserved
  drvName: string;
  /** Postal address lines of the office (Verbindungsstelle line first). */
  drvPostalAddress: string[];
  /** Postal agent's name (Admin settings, default "Anna Kliem"). */
  agentName: string;
  /** anna_postal_address: optional c/o line, street, "PLZ Ort". */
  agentPostalAddress: string[];
  signaturePlace: string;
  signatureDate: string; // DD.MM.YYYY
}

export interface DirectCoverLetterInput extends DirectDocFields {
  /** Documents actually attached, in print order, cover letter excluded. */
  attachmentList: string[];
}

export const DIRECT_COVER_SUBJECT =
  'Antrag auf Erstattung von Rentenversicherungsbeiträgen';

/** Placeholder map for the "no unresolved placeholder" check. */
export function directFieldValues(
  f: DirectDocFields
): Record<string, string | string[]> {
  return {
    client_full_name: f.clientFullName,
    client_residential_address: f.clientResidentialAddress,
    client_date_of_birth: f.clientDateOfBirth,
    client_vsnr: f.clientVsnr,
    drv_name: f.drvName,
    drv_postal_address: f.drvPostalAddress,
    anna_name: f.agentName,
    anna_postal_address: f.agentPostalAddress,
    signature_place: f.signaturePlace,
    signature_date: f.signatureDate,
  };
}

/** Pure draw plan of the cover letter (may run onto a second page). */
export function buildDirectCoverLetterPlan(
  input: DirectCoverLetterInput,
  font: PDFFont,
  bold: PDFFont
): DirectOp[] {
  assertResolved({
    ...directFieldValues(input),
    attachment_list: input.attachmentList,
  });
  const w = new FlowWriter(font, bold);
  const { lineHeight } = DIRECT_LAYOUT;

  // Sender: the client.
  w.y = 50;
  w.line(input.clientFullName, { size: 10 });
  for (const l of input.clientResidentialAddress) w.line(l, { size: 10 });

  // Address window: the responsible DRV office.
  w.y = Math.max(w.y + lineHeight, 150);
  for (const l of w.wrap(input.drvName)) l();
  for (const l of input.drvPostalAddress) w.line(l);

  // Place, date (right-aligned).
  w.blank();
  const placeDate = `${input.signaturePlace}, ${input.signatureDate}`;
  w.line(placeDate, {
    x:
      A4.width -
      DIRECT_LAYOUT.marginRight -
      font.widthOfTextAtSize(placeDate, DIRECT_LAYOUT.fontSize),
  });

  // Subject.
  w.blank();
  w.para(DIRECT_COVER_SUBJECT, { bold: true });
  w.line(`Versicherungsnummer: ${input.clientVsnr}`);
  w.line(`Geburtsdatum: ${input.clientDateOfBirth}`);
  w.blank();

  // Body (template text verbatim; the agent's name from Admin settings).
  w.line('Sehr geehrte Damen und Herren,');
  w.blank();
  w.para(
    'hiermit beantrage ich die Erstattung meiner Rentenversicherungsbeiträge. Den von mir unterschriebenen Antrag V0901 und die zugehörigen Unterlagen füge ich bei.'
  );
  w.blank();
  w.para(
    `Ich stelle den Antrag selbst. Für den Postempfang in diesem Verfahren habe ich Frau ${input.agentName} mit der beigefügten Postempfangsvollmacht bevollmächtigt. Bitte senden Sie die Korrespondenz einschließlich Bescheiden an:`
  );
  w.blank();
  w.keepTogether((1 + input.agentPostalAddress.length) * lineHeight);
  w.line(input.agentName);
  for (const l of input.agentPostalAddress) w.line(l);
  w.blank();
  w.para(
    'Die Vollmacht ist auf den dort beschriebenen Postempfang und die Weiterleitung beschränkt. Sie umfasst keine Vertretung bei der Antragstellung oder bei sonstigen inhaltlichen Verfahrenshandlungen.'
  );
  w.blank();
  w.para(
    'Bitte überweisen Sie den Erstattungsbetrag unmittelbar auf mein im V0901 angegebenes Konto.'
  );
  w.blank();
  w.keepTogether(
    lineHeight * 2 + DIRECT_LAYOUT.signatureHeight + 4 + 3 * lineHeight
  );
  w.line('Mit freundlichen Grüßen');
  w.blank();
  w.signatureBlock({
    caption: 'Unterschrift der antragstellenden Person',
    name: input.clientFullName,
  });

  // Anlagen: the heading stays with its first entry.
  w.blank();
  w.keepTogether(lineHeight * 2);
  w.line('Anlagen', { bold: true });
  for (const a of input.attachmentList) w.para(`•  ${a}`, { hanging: 12 });

  return w.ops;
}

/** Adds the cover letter to `doc`; returns the number of pages added. */
export async function renderDirectCoverLetter(
  doc: PDFDocument,
  input: DirectCoverLetterInput,
  clientSignaturePng?: Uint8Array | null
): Promise<number> {
  const fonts = await directFonts(doc);
  const ops = buildDirectCoverLetterPlan(input, fonts.font, fonts.bold);
  return renderDirectPlan(doc, ops, fonts, clientSignaturePng);
}
