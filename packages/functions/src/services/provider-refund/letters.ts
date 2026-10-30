/**
 * Provider cover letter ([Provider]_Refund_Cover_Letter_Direct.docx) and
 * the shared Postempfangsvollmacht (GPR_Postempfangsvollmacht_Anna_Kliem
 * _DE.docx, general version) for provider refunds, owner spec 29 Oct
 * 2026. Same plan/render split as the DRV direct documents. Both are
 * signed by the client; the postal agent comes from Admin settings.
 *
 * The recipient block sits where the lettershop-approved VBL cover letter
 * puts it (DIN 5008 Typ B window), so the VBL pack can keep going through
 * the lettershop.
 */

import { PDFDocument, PDFFont } from 'pdf-lib';
import { A4, COVER_LAYOUT } from '../claim-pdf/constants';
import {
  assertResolved,
  DIRECT_LAYOUT,
  directFonts,
  FlowWriter,
  renderDirectPlan,
  type DirectOp,
} from '../drv-pack/direct-layout';
import type { ProviderRefundProvider } from './providers';

export interface ProviderLetterFields {
  clientFullName: string;
  /** Street, optional supplement, "PLZ Ort", country — one entry per line. */
  clientResidentialAddress: string[];
  clientDateOfBirth: string; // DD.MM.YYYY
  referenceLabel: string; // "Versicherungsnummer"
  /** As in the provider's correspondence (prefix, leading zeros kept). */
  referenceValue: string;
  provider: ProviderRefundProvider;
  /** "mein Verfahren …" (providerProcedureDescription). */
  procedureDescription: string;
  agentName: string;
  /** Optional c/o line, street, "PLZ Ort". */
  agentPostalAddress: string[];
  signaturePlace: string;
  signatureDate: string; // DD.MM.YYYY
}

export interface ProviderCoverLetterInput extends ProviderLetterFields {
  /** German attachment list, generated from the final pack. */
  attachmentList: string[];
}

/** Address window: 85 mm wide from 20 mm, the text starts at x 68.3. */
export const RECIPIENT_WINDOW = {
  x: COVER_LAYOUT.recipient.x,
  top: COVER_LAYOUT.recipient.firstLineTop,
  maxWidth: (85 * 72) / 25.4 - (COVER_LAYOUT.recipient.x - (20 * 72) / 25.4),
  /** Bottom of the window (85 mm from the top of the page). */
  bottom: (85 * 72) / 25.4,
} as const;

function fieldValues(f: ProviderLetterFields) {
  return {
    client_full_name: f.clientFullName,
    client_residential_address: f.clientResidentialAddress,
    client_date_of_birth: f.clientDateOfBirth,
    reference_label: f.referenceLabel,
    reference_value: f.referenceValue,
    recipient_postal_address: f.provider.recipient,
    procedure_description: f.procedureDescription,
    agent_name: f.agentName,
    agent_postal_address: f.agentPostalAddress,
    signature_place: f.signaturePlace,
    signature_date: f.signatureDate,
  };
}

/** Largest size ≤ 10.5 pt at which every line fits the window width. */
function recipientFontSize(lines: string[], font: PDFFont): number {
  let size = DIRECT_LAYOUT.fontSize;
  while (
    size > 8 &&
    lines.some(
      (l) => font.widthOfTextAtSize(l, size) > RECIPIENT_WINDOW.maxWidth
    )
  )
    size -= 0.5;
  return size;
}

/** Pure draw plan of the provider cover letter (may run onto page 2). */
export function buildProviderCoverLetterPlan(
  input: ProviderCoverLetterInput,
  font: PDFFont,
  bold: PDFFont
): DirectOp[] {
  assertResolved({
    ...fieldValues(input),
    attachment_list: input.attachmentList,
  });
  const w = new FlowWriter(font, bold);
  const { lineHeight } = DIRECT_LAYOUT;

  // Sender: the client, above the window.
  w.y = 50;
  w.line(input.clientFullName, { size: 10 });
  for (const l of input.clientResidentialAddress) w.line(l, { size: 10 });

  // Recipient in the address window, "Deutschland" as the last line.
  const recipient = [...input.provider.recipient, 'Deutschland'];
  const size = recipientFontSize(recipient, font);
  w.y = Math.max(w.y + lineHeight, RECIPIENT_WINDOW.top);
  for (const l of recipient) w.line(l, { size, x: RECIPIENT_WINDOW.x });

  // Place, date (right-aligned).
  w.y = Math.max(w.y + lineHeight, RECIPIENT_WINDOW.bottom + lineHeight);
  const placeDate = `${input.signaturePlace}, ${input.signatureDate}`;
  w.line(placeDate, {
    x:
      A4.width -
      DIRECT_LAYOUT.marginRight -
      font.widthOfTextAtSize(placeDate, DIRECT_LAYOUT.fontSize),
  });

  // Subject.
  w.blank();
  w.para(input.provider.subject, { bold: true });
  w.line(`Name: ${input.clientFullName}, geb. ${input.clientDateOfBirth}`);
  w.line(`${input.referenceLabel}: ${input.referenceValue}`);
  w.blank();

  // Body (template text verbatim; the agent from Admin settings).
  w.line('Sehr geehrte Damen und Herren,');
  w.blank();
  w.para(input.provider.coverIntro);
  w.blank();
  w.para(
    'Bitte überweisen Sie den Erstattungsbetrag unmittelbar auf mein im Antrag oder in der beigefügten Bankverbindungserklärung angegebenes Konto.'
  );
  w.blank();
  w.para(
    `Für den Empfang der Post zu diesem Verfahren habe ich ${input.agentName} mit der beigefügten Postempfangsvollmacht bevollmächtigt. Bitte senden Sie die gesamte Korrespondenz einschließlich Bescheiden und etwaiger förmlicher Zustellungen an:`
  );
  w.blank();
  w.keepTogether((2 + input.agentPostalAddress.length) * lineHeight);
  w.line(input.agentName);
  for (const l of input.agentPostalAddress) w.line(l);
  w.line('Deutschland');
  w.blank();
  w.para(
    'Bitte bestätigen Sie den Eingang meines Antrags und teilen Sie mir den Erstattungsbetrag und dessen Berechnung mit.'
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
  input.attachmentList.forEach((a, i) =>
    w.para(`${i + 1}. ${a}`, { hanging: 12 })
  );

  return w.ops;
}

/** Pure draw plan of the Postempfangsvollmacht (one per provider/procedure). */
export function buildProviderPostalAuthorityPlan(
  input: ProviderLetterFields,
  font: PDFFont,
  bold: PDFFont
): DirectOp[] {
  assertResolved(fieldValues(input));
  const w = new FlowWriter(font, bold);
  const agent = input.agentName;

  w.y = 80;
  w.line('Postempfangsvollmacht', { bold: true, size: 16 });
  w.blank();
  w.para(`Für ${input.procedureDescription}`, { bold: true });
  w.blank();
  w.para(
    `Ich, ${input.clientFullName}, geboren am ${input.clientDateOfBirth},`
  );
  // "wohnhaft" + the multiline address, continuation lines aligned.
  const lead = 'wohnhaft ';
  const indent = font.widthOfTextAtSize(lead, DIRECT_LAYOUT.fontSize);
  input.clientResidentialAddress.forEach((l, i, all) => {
    const text = `${i === 0 ? lead : ''}${l}${i === all.length - 1 ? ',' : ''}`;
    w.para(text, i === 0 ? { hanging: indent } : { indent });
  });
  w.line(`${input.referenceLabel}: ${input.referenceValue},`);
  w.blank();
  w.para(
    'bevollmächtige ausschließlich für den nachfolgend beschriebenen Postempfang:'
  );
  w.blank();
  w.line(agent, { bold: true });
  for (const l of input.agentPostalAddress) w.line(l);
  w.blank();
  w.para(
    `Die Vollmacht umfasst die Entgegennahme der an mich gerichteten Schreiben und Bescheide zu dem oben bezeichneten Verfahren, einschließlich etwaiger förmlicher Zustellungen. ${agent} darf diese Post öffnen, einscannen und an mich weiterleiten.`
  );
  w.blank();
  w.para(
    'Eine darüber hinausgehende Verfahrensvertretung oder Geldempfangsvollmacht wird nicht erteilt.'
  );
  w.blank();
  w.para(
    'Diese Vollmacht gilt ab Unterzeichnung ausschließlich für das oben bezeichnete Verfahren. Ich kann sie jederzeit widerrufen. Gegenüber der im Betreff genannten Stelle wird der Widerruf erst wirksam, wenn er dort eingegangen ist.'
  );
  w.blank(2);
  w.signatureBlock({
    placeDate: `${input.signaturePlace}, ${input.signatureDate}`,
    caption: 'Unterschrift der antragstellenden Person',
    name: input.clientFullName,
  });
  return w.ops;
}

export async function renderProviderCoverLetter(
  doc: PDFDocument,
  input: ProviderCoverLetterInput,
  signaturePng?: Uint8Array | null
): Promise<number> {
  const fonts = await directFonts(doc);
  const ops = buildProviderCoverLetterPlan(input, fonts.font, fonts.bold);
  return renderDirectPlan(doc, ops, fonts, signaturePng);
}

export async function renderProviderPostalAuthority(
  doc: PDFDocument,
  input: ProviderLetterFields,
  signaturePng?: Uint8Array | null
): Promise<number> {
  const fonts = await directFonts(doc);
  const ops = buildProviderPostalAuthorityPlan(input, fonts.font, fonts.bold);
  return renderDirectPlan(doc, ops, fonts, signaturePng);
}
