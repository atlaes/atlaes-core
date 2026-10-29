/**
 * Postempfangsvollmacht for the postal agent (template
 * GPR_Postempfangsvollmacht_Anna_Kliem_DE.docx, owner spec 29 Oct 2026).
 * A separate authorization for the named case and DRV office, signed by
 * the client: receipt of letters, Bescheide and formal service only — no
 * representation, no receipt of money, no sub-authority. The agent's name
 * and address come from Admin settings (OpsSettingsService.postalAgent).
 */

import { PDFDocument, PDFFont } from 'pdf-lib';
import {
  assertResolved,
  DIRECT_LAYOUT,
  directFonts,
  FlowWriter,
  renderDirectPlan,
  type DirectOp,
} from './direct-layout';
import { directFieldValues, type DirectDocFields } from './direct-cover-letter';

/**
 * procedure_description: "mein Beitragserstattungsverfahren bei [DRV
 * office]" in the dative ("bei der Deutschen Rentenversicherung Bund").
 */
export function procedureDescription(drvName: string): string {
  const name = drvName.trim();
  const m = /^Deutsche Rentenversicherung\b(.*)$/.exec(name);
  return m
    ? `mein Beitragserstattungsverfahren bei der Deutschen Rentenversicherung${m[1]}`
    : `mein Beitragserstattungsverfahren bei ${name}`;
}

/** Pure draw plan of the Postempfangsvollmacht. */
export function buildPostalAuthorityPlan(
  input: DirectDocFields,
  font: PDFFont,
  bold: PDFFont
): DirectOp[] {
  assertResolved(directFieldValues(input));
  const w = new FlowWriter(font, bold);
  const agent = input.agentName;

  w.y = 80;
  w.line('Postempfangsvollmacht', { bold: true, size: 16 });
  w.blank();
  w.para(`Für ${procedureDescription(input.drvName)}`, { bold: true });
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
  w.line(`Versicherungsnummer ${input.clientVsnr},`);
  w.blank();
  w.para(
    'bevollmächtige ausschließlich für den nachfolgend beschriebenen Postempfang:'
  );
  w.blank();
  w.line(agent, { bold: true });
  for (const l of input.agentPostalAddress) w.line(l);
  w.blank();
  w.para(
    `Die Vollmacht umfasst die Entgegennahme der an mich gerichteten Schreiben und Bescheide zu diesem Beitragserstattungsverfahren, einschließlich etwaiger förmlicher Zustellungen. ${agent} darf diese Post öffnen, einscannen und an mich weiterleiten.`
  );
  w.blank();
  w.para(
    'Eine darüber hinausgehende Verfahrensvertretung oder Geldempfangsvollmacht wird nicht erteilt.'
  );
  w.blank();
  w.para(
    `Mir ist bekannt, dass der Zugang eines Bescheids bei ${agent} Fristen auslösen kann, auch wenn ich die weitergeleitete Kopie erst später erhalte.`
  );
  w.blank();
  w.para(
    'Diese Vollmacht gilt ab Unterzeichnung ausschließlich für dieses Beitragserstattungsverfahren. Ich kann sie jederzeit widerrufen. Gegenüber dem Rentenversicherungsträger wird der Widerruf erst wirksam, wenn er dort eingegangen ist.'
  );
  w.blank(2);
  w.signatureBlock({
    placeDate: `${input.signaturePlace}, ${input.signatureDate}`,
    caption: 'Unterschrift der antragstellenden Person',
    name: input.clientFullName,
  });
  return w.ops;
}

/** Adds the Postempfangsvollmacht to `doc`; returns the pages added. */
export async function renderPostalAuthority(
  doc: PDFDocument,
  input: DirectDocFields,
  clientSignaturePng?: Uint8Array | null
): Promise<number> {
  const fonts = await directFonts(doc);
  const ops = buildPostalAuthorityPlan(input, fonts.font, fonts.bold);
  return renderDirectPlan(doc, ops, fonts, clientSignaturePng);
}
