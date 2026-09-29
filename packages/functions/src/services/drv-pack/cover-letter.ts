/**
 * Vividius cover letter (Anschreiben) for a DRV refund filing.
 *
 * Text and rules: "GPR — Cover-letter template logic · Brief for Karl ·
 * 15 September 2026 · rev. 2". One gender-neutral template; Template A
 * (standard) and A-VS (Verbindungsstelle) differ only in the address
 * window and two heading lines. The Anlagen block lists exactly the
 * documents in the envelope (never a static list). "Unser Zeichen" is the
 * firm's Aktenzeichen, which therefore must exist before generation.
 *
 * Layout: A4, DIN 5008-style window, letterhead image top-right, footer
 * with the firm's details as on the current letters.
 */

import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import { A4 } from '../claim-pdf/constants';
import { wrapText } from '../claim-pdf/text-layout';
import { loadGprAsset } from './assets';

export const VIVIDIUS = {
  name: 'Vividius Rechtsanwälte',
  lawyer: 'Katja Chudoba',
  lawyerTitle: 'Rechtsanwältin',
  street: 'Gneisenaustr. 115',
  streetLong: 'Gneisenaustraße 115',
  postalCode: '10961',
  city: 'Berlin',
  phone: '030 69517378',
  email: 'info@vividius.de',
  escrowIban: 'DE46 1005 0000 0670 0124 67',
  escrowIbanCompact: 'DE46100500000670012467',
  escrowBank: 'Berliner Sparkasse, Berlin',
  escrowBic: 'BELADEBEXX',
  footerLines: [
    'Vividius Rechtsanwälte · Gneisenaustraße 115 · 10961 Berlin · Deutschland · Inhaberin: Katja Chudoba – Rechtsanwältin, Fachanwältin für Gewerblichen Rechtsschutz',
    'Telefon +49 (0)30 69 51 73 78 · Telefax +49 (0)30 69 51 73 79 · E-Mail info@vividius.de · www.vividius.de · St.-Nr. 14/251/02589 · USt-ID DE 363375993',
    'Berliner Sparkasse · IBAN DE46 1005 0000 0670 0124 67 · BIC BELADEBEXX',
  ],
} as const;

export interface CoverLetterRecipient {
  carrierName: string; // full name, never "DRV"
  mailingAddress: string[]; // Postanschrift lines, complete as stored
  email: string; // advance-copy e-mail
  beA?: boolean; // render "Per beA" only when used
  /** Set when the office acts as Verbindungsstelle → Template A-VS. */
  verbindungsstelleCountryDe?: string | null;
}

export interface CoverLetterInput {
  recipient: CoverLetterRecipient;
  ourRef: string; // Aktenzeichen, e.g. "06152-26"
  date: Date;
  client: { lastName: string; firstName: string };
  vsnr: string; // spaced as on record
  anlagen: string[]; // rendered bullets, in envelope order
}

export type CoverOp =
  | {
      kind: 'text';
      text: string;
      x: number;
      yTop: number;
      size: number;
      bold?: boolean;
    }
  | {
      kind: 'image';
      asset: 'letterhead' | 'signature';
      x: number;
      yTop: number;
      height: number;
    };

export const COVER = {
  marginLeft: 70,
  marginRight: 70,
  fontSize: 11,
  lineHeight: 14.5,
  smallSize: 7,
  windowTop: 138,
  refColumnX: 360,
  refTop: 150,
  subjectTop: 300,
  bodyTop: 348,
  letterhead: { width: 150, top: 42 },
  signatureHeight: 40,
  footerTop: 782,
} as const;

export function formatGermanDateLong(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** "{{last_name}}, {{first_name}}" exactly as in the pension record. */
export function clientNameLastFirst(c: {
  lastName: string;
  firstName: string;
}): string {
  return `${c.lastName.trim()}, ${c.firstName.trim()}`;
}

/** Pure draw plan (top-origin coordinates) — unit-testable without a PDF. */
export function buildCoverLetterPlan(
  input: CoverLetterInput,
  font: PDFFont,
  bold: PDFFont
): CoverOp[] {
  const ops: CoverOp[] = [];
  const { marginLeft, fontSize, lineHeight } = COVER;
  const maxWidth = A4.width - marginLeft - COVER.marginRight;
  const isVs = Boolean(input.recipient.verbindungsstelleCountryDe);
  const vsDe = input.recipient.verbindungsstelleCountryDe ?? '';
  const clientName = clientNameLastFirst(input.client);

  ops.push({
    kind: 'image',
    asset: 'letterhead',
    x: A4.width - COVER.marginRight - COVER.letterhead.width,
    yTop: COVER.letterhead.top,
    height: (COVER.letterhead.width * 94) / 396,
  });

  // Sender line above the window (small).
  ops.push({
    kind: 'text',
    text: `${VIVIDIUS.name.replace(' Rechtsanwälte', '')} · ${VIVIDIUS.streetLong} · ${VIVIDIUS.postalCode} ${VIVIDIUS.city}`,
    x: marginLeft,
    yTop: COVER.windowTop - 12,
    size: COVER.smallSize,
  });

  // Address window.
  let y = COVER.windowTop;
  const winLine = (text: string, b = false) => {
    ops.push({
      kind: 'text',
      text,
      x: marginLeft,
      yTop: y,
      size: fontSize,
      bold: b,
    });
    y += lineHeight;
  };
  winLine(input.recipient.carrierName);
  if (isVs) winLine(`Verbindungsstelle ${vsDe}`, true);
  for (const line of input.recipient.mailingAddress) winLine(line);
  y += lineHeight;
  winLine(`vorab per E-Mail an ${input.recipient.email}`);
  if (input.recipient.beA) winLine('Per beA');

  // Reference block (right column).
  let ry = COVER.refTop;
  const refLine = (text: string, b = false) => {
    ops.push({
      kind: 'text',
      text,
      x: COVER.refColumnX,
      yTop: ry,
      size: fontSize,
      bold: b,
    });
    ry += lineHeight;
  };
  refLine(`Unser Zeichen: ${input.ourRef}`);
  refLine(`${VIVIDIUS.city}, den ${formatGermanDateLong(input.date)}`);
  if (isVs) {
    ry += lineHeight;
    refLine(`Vertrag: ${vsDe.toUpperCase()}`, true);
    refLine(`Verbindungsstelle: ${vsDe.toUpperCase()}`, true);
  }

  // Subject block.
  ops.push({
    kind: 'text',
    text: `Beitragsrückerstattung an ${clientName}`,
    x: marginLeft,
    yTop: COVER.subjectTop,
    size: fontSize,
    bold: true,
  });
  ops.push({
    kind: 'text',
    text: `Versicherungsnr.: ${input.vsnr}`,
    x: marginLeft,
    yTop: COVER.subjectTop + lineHeight,
    size: fontSize,
    bold: true,
  });

  // Body.
  let cursor = COVER.bodyTop;
  const line = (text: string, x = marginLeft) => {
    ops.push({ kind: 'text', text, x, yTop: cursor, size: fontSize });
    cursor += lineHeight;
  };
  const blank = () => {
    cursor += lineHeight;
  };
  const para = (text: string) => {
    for (const l of wrapText(text, font, fontSize, maxWidth)) line(l);
  };

  line('Sehr geehrte Damen und Herren,');
  blank();
  para(
    `in der vorbezeichneten Angelegenheit zeigen wir die anwaltliche Vertretung von ${clientName}, Versicherungsnr. ${input.vsnr}, an. Namens und in Vollmacht unserer Mandantschaft überreichen wir Ihnen beiliegend einen Antrag auf Beitragserstattung bei Aufenthalt im Ausland (V0901) sowie die folgenden Dokumente:`
  );
  blank();
  for (const a of input.anlagen) {
    const wrapped = wrapText(a, font, fontSize, maxWidth - 16);
    wrapped.forEach((l, i) => line(i === 0 ? `•  ${l}` : `    ${l}`));
  }
  blank();
  para(
    'Bitte stellen Sie den Erstattungsbescheid und ggf. sonstige Schriftstücke ausschließlich an unsere Kanzlei zu, damit wir einen reibungslosen Ablauf des Verfahrens gewährleisten können.'
  );
  blank();
  line('Mit freundlichen Grüßen');
  blank();
  ops.push({
    kind: 'image',
    asset: 'signature',
    x: marginLeft,
    yTop: cursor,
    height: COVER.signatureHeight,
  });
  cursor += COVER.signatureHeight + 4;
  line(VIVIDIUS.lawyer);
  line(VIVIDIUS.lawyerTitle);

  // Footer.
  VIVIDIUS.footerLines.forEach((t, i) => {
    ops.push({
      kind: 'text',
      text: t,
      x: marginLeft,
      yTop: COVER.footerTop + i * 9,
      size: COVER.smallSize,
    });
  });

  return ops;
}

/** Adds the cover letter as one A4 page to `doc`. */
export async function renderCoverLetter(
  doc: PDFDocument,
  input: CoverLetterInput
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const letterhead = await doc.embedJpg(loadGprAsset('letterhead'));
  const signature = await doc.embedPng(loadGprAsset('signature'));
  const page = doc.addPage([A4.width, A4.height]);
  for (const op of buildCoverLetterPlan(input, font, bold)) {
    if (op.kind === 'text') {
      const f = op.bold ? bold : font;
      const ascent = f.heightAtSize(op.size, { descender: false });
      page.drawText(op.text, {
        x: op.x,
        y: A4.height - op.yTop - ascent,
        size: op.size,
        font: f,
      });
    } else {
      const img = op.asset === 'letterhead' ? letterhead : signature;
      const scale = op.height / img.height;
      page.drawImage(img, {
        x: op.x,
        y: A4.height - op.yTop - op.height,
        width: img.width * scale,
        height: op.height,
      });
    }
  }
}
