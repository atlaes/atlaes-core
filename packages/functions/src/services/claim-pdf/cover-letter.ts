import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import { A4, COVER_LAYOUT, POA_HOLDER } from './constants';
import { wrapText } from './text-layout';

export interface CoverLetterData {
  firstName: string;
  lastName: string;
  vblReference: string;
  signingPlace: string;
  dateToday: string; // pre-formatted DD.MM.YYYY
  signaturePng: Uint8Array;
}

export type DrawOp =
  | {
      kind: 'text';
      text: string;
      x: number;
      yTop: number;
      size: number;
      bold?: boolean;
    }
  | { kind: 'signature'; x: number; yTop: number; height: number };

const maxWidth = A4.width - 2 * COVER_LAYOUT.marginLeft;

/**
 * Builds the cover letter draw plan as a pure function of the input data
 * and embedded fonts. Coordinates are TOP-origin (`yTop`) so tests can
 * assert placement directly against the lettershop-measured reference
 * values without parsing a rendered PDF. `renderCoverLetter` is
 * responsible for converting to pdf-lib's bottom-origin coordinates.
 */
export function buildCoverLetterPlan(
  data: CoverLetterData,
  font: PDFFont,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  boldFont: PDFFont
): DrawOp[] {
  const ops: DrawOp[] = [];
  const { marginLeft, fontSize, lineHeight } = COVER_LAYOUT;

  // Recipient address block — pinned to the DIN 5008 Typ B window zone.
  ops.push({
    kind: 'text',
    text: 'VBL. Kundenservice',
    x: COVER_LAYOUT.recipient.x,
    yTop: COVER_LAYOUT.recipient.firstLineTop,
    size: fontSize,
  });
  ops.push({
    kind: 'text',
    text: '76240 Karlsruhe',
    x: COVER_LAYOUT.recipient.x,
    yTop: COVER_LAYOUT.recipient.secondLineTop,
    size: fontSize,
  });

  // Date line (place, comma, "den", date) — right-aligned so its right edge
  // is flush with the body's right margin. x is computed from the measured
  // text width (true right-alignment) rather than a fixed left offset.
  const dateLineText = `${data.signingPlace}, den ${data.dateToday}`;
  const rightEdge = A4.width - COVER_LAYOUT.marginRight;
  ops.push({
    kind: 'text',
    text: dateLineText,
    x: rightEdge - font.widthOfTextAtSize(dateLineText, fontSize),
    yTop: COVER_LAYOUT.dateLine.top,
    size: fontSize,
  });

  // Subject line — bold.
  ops.push({
    kind: 'text',
    text: `Antrag auf Beitragserstattung – Versicherungsnummer ${data.vblReference}`,
    x: marginLeft,
    yTop: COVER_LAYOUT.subjectTop,
    size: fontSize,
    bold: true,
  });

  // Body — cursor-driven flow starting at bodyTop, advancing by
  // lineHeight per emitted line. Blank lines advance the cursor without
  // emitting a draw op.
  let cursor = COVER_LAYOUT.bodyTop;

  const emitLine = (text: string): void => {
    ops.push({
      kind: 'text',
      text,
      x: marginLeft,
      yTop: cursor,
      size: fontSize,
    });
    cursor += lineHeight;
  };

  const emitBlank = (): void => {
    cursor += lineHeight;
  };

  const emitParagraph = (text: string): void => {
    for (const line of wrapText(text, font, fontSize, maxWidth)) {
      emitLine(line);
    }
  };

  emitLine('Sehr geehrte Damen und Herren,');
  emitParagraph(
    'Im Anhang übersende ich Ihnen Dokumente zur Durchführung meiner Beitragserstattung.'
  );
  emitBlank();

  emitParagraph(
    'Bitte senden Sie den Erstattungsbescheid per Post an die Postempfangs-Bevollmächtigte'
  );
  emitBlank();

  emitLine(`${POA_HOLDER.salutation} ${POA_HOLDER.fullName}`);
  emitLine(POA_HOLDER.street);
  emitLine(POA_HOLDER.postalCodeCity);
  emitLine(POA_HOLDER.country);
  emitBlank();

  emitParagraph(`oder per E-Mail an ${POA_HOLDER.email}.`);
  emitBlank();

  emitLine('Mit freundlichen Grüßen');
  emitBlank();

  // Signature image sits between the closing and the printed name.
  ops.push({
    kind: 'signature',
    x: marginLeft,
    yTop: cursor,
    height: COVER_LAYOUT.signatureImageHeight,
  });
  cursor += COVER_LAYOUT.signatureImageHeight;

  emitLine(`${data.firstName} ${data.lastName}`);
  emitBlank();

  emitLine('Anhang:');
  emitLine('Antrag auf Beitragserstattung');
  emitLine('Kopie Reisepass (Vollmachtgeber)');
  emitLine('Postempfangsvollmacht');
  emitLine(
    `Kopie Personalausweis der Bevollmächtigten (${POA_HOLDER.fullName})`
  );

  return ops;
}

/** Adds the DIN 5008 Typ B cover letter as a single A4 page to `doc`. */
export async function renderCoverLetter(
  doc: PDFDocument,
  data: CoverLetterData
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const signatureImage = await doc.embedPng(data.signaturePng);

  const page = doc.addPage([A4.width, A4.height]);
  const plan = buildCoverLetterPlan(data, font, boldFont);

  for (const op of plan) {
    if (op.kind === 'text') {
      const opFont = op.bold ? boldFont : font;
      // op.yTop is a pdftotext yMin (the top of the glyph box), which sits
      // one font ascent above the baseline — not one fontSize above it.
      // Using `size` here (as opposed to the font's actual ascent) under-
      // shoots the ascent by ~3pt at size 11, pushing every line too low.
      const ascent = opFont.heightAtSize(op.size, { descender: false });
      page.drawText(op.text, {
        x: op.x,
        y: A4.height - op.yTop - ascent,
        size: op.size,
        font: opFont,
      });
    } else {
      const scale = op.height / signatureImage.height;
      const width = signatureImage.width * scale;
      page.drawImage(signatureImage, {
        x: op.x,
        y: A4.height - op.yTop - op.height,
        width,
        height: op.height,
      });
    }
  }
}
