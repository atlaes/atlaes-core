import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import { A4, COVER_LAYOUT, POA_HOLDER } from './constants';
import { wrapText } from './text-layout';

export interface PoaLetterData {
  firstName: string;
  lastName: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  dateOfBirth: string; // DD.MM.YYYY
  placeOfBirth: string;
  vblReference: string;
  dateToday: string; // DD.MM.YYYY
  signaturePng: Uint8Array;
}

const TITLE =
  'Empfangsvollmacht für Post der Versorgungsanstalt des Bundes und der Länder (VBL)';

/**
 * Bullet points for the "Umfang der Vollmacht" section. Each has a bold
 * lead-in phrase (rendered bold, followed by regular body text). Split so
 * the renderer can mix bold/regular within one wrapped line.
 */
const BULLETS: { lead: string; body: string }[] = [
  {
    lead: 'Annahme von Postsendungen:',
    body: ' Entgegennahme von Briefen, Paketen und sonstigen Postsendungen der VBL.',
  },
  {
    lead: 'Unterschrift bei Annahme:',
    body: ' Unterzeichnung von Empfangsbestätigungen und Zustellnachweisen.',
  },
  {
    lead: 'Verwaltung der Post:',
    body: ' Öffnen und Sortieren der Post sowie Weiterleitung an mich.',
  },
  {
    lead: 'Abholung von Postsendungen:',
    body: ' Abholung von Postsendungen bei der Poststelle oder einem Paketdienst.',
  },
  {
    lead: 'Korrespondenz:',
    body: ' Führen der notwendigen Korrespondenz und Kommunikation mit der VBL im Zusammenhang mit meinem Beitragserstattungsverfahren.',
  },
];

/**
 * Builds the full plain-text content of the Postempfangsvollmacht letter,
 * one logical field per line (blocks separated by blank lines). This is a
 * pure function purpose-built for placeholder-substitution and structure
 * testing; the actual layout/pagination happens in `buildPoaLetterPlan`.
 */
export function buildPoaText(data: PoaLetterData): string {
  const lines = [
    TITLE,
    '',
    'Vollmachtgeber:',
    `Vorname: ${data.firstName}`,
    `Nachname: ${data.lastName}`,
    `Anschrift: ${data.streetAddress}, ${data.postalCode} ${data.city}`,
    `Geburtsdatum: ${data.dateOfBirth}`,
    `Geburtsort: ${data.placeOfBirth}`,
    `VBL-Versicherungsnummer / Aktenzeichen: ${data.vblReference}`,
    '',
    'Bevollmächtigte:',
    // Keep in sync with POA_HOLDER in ./constants.
    `Vorname: ${POA_HOLDER.firstNames}`,
    `Nachname: ${POA_HOLDER.lastNameWithBirth}`,
    `Anschrift: ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity}`,
    '',
    `Hiermit erteile ich, ${data.firstName} ${data.lastName}, geboren am ${data.dateOfBirth} in ${data.placeOfBirth} und wohnhaft in ${data.streetAddress}, ${data.postalCode} ${data.city} (nachfolgend „Vollmachtgeber" genannt), der ${POA_HOLDER.nameWithBirthName}, geboren am ${POA_HOLDER.birthDate} in ${POA_HOLDER.birthPlace} und wohnhaft in ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity} (nachfolgend „Bevollmächtigte" genannt), die Vollmacht, alle Post der VBL in meinem Namen entgegenzunehmen und zu verwalten sowie die im Zusammenhang mit meinem Beitragserstattungsverfahren erforderliche Korrespondenz mit der VBL zu führen.`,
    '',
    'Umfang der Vollmacht:',
    'Die Bevollmächtigte ist berechtigt, folgende Handlungen in meinem Namen vorzunehmen:',
    '',
    ...BULLETS.map((b) => `• ${b.lead}${b.body}`),
    '',
    `Diese Vollmacht ist ab dem ${data.dateToday} gültig und bleibt bis zum Abschluss des Beitragserstattungsverfahrens bzw. bis auf schriftlichen Widerruf durch den Vollmachtgeber bestehen. Anschließend soll alle Post wieder direkt an den Vollmachtgeber zugestellt werden.`,
    '',
    `${data.city}, ${data.dateToday}`,
    `Unterschrift des Vollmachtgebers (${data.firstName} ${data.lastName})`,
  ];
  return lines.join('\n');
}

/** One inline text run within a single line; `bold` picks the font. */
export interface TextSegment {
  text: string;
  bold: boolean;
}

export type DrawOp =
  | {
      kind: 'text';
      // When `segments` is present the line is drawn run-by-run (mixed
      // bold/regular); otherwise `text`/`bold` describe the whole line.
      text: string;
      segments?: TextSegment[];
      x: number;
      yTop: number;
      size: number;
      bold?: boolean;
      page: number;
    }
  | {
      kind: 'signature';
      x: number;
      yTop: number;
      height: number;
      maxWidth: number;
      page: number;
    }
  | {
      kind: 'rule';
      x: number;
      yTop: number;
      width: number;
      page: number;
    };

const { marginLeft, fontSize, lineHeight, signatureImageHeight } = COVER_LAYOUT;
const marginRight = COVER_LAYOUT.marginRight;
const maxWidth = A4.width - marginLeft - marginRight;
// Title fits on one line at 11pt bold within the margins (verified against
// the client sample). Kept at body size, bold, and wrapped defensively if
// a future margin change ever made it overflow.
const TITLE_SIZE = 11;
const START_TOP = 80;
const BULLET_PREFIX = '• ';
const BULLET_INDENT = 12;
const PAGE_BREAK_GUARD = A4.height - marginRight;
const SIGNATURE_GAP = 16;
const SIGNATURE_ROW_GAP = 4;
// A 60pt-wide signature remains visually legible at the 40pt preferred
// height. Narrower shared-row space moves the signature to its own row.
const MIN_SIGNATURE_WIDTH = signatureImageHeight * 1.5;

/**
 * Builds the Postempfangsvollmacht draw plan as a pure function of the
 * input data and embedded fonts. Coordinates are TOP-origin (`yTop`),
 * following the same idiom as `buildCoverLetterPlan`. `page` is a 0-based
 * index into the pages that `renderPoaLetter` will create; a new page is
 * started whenever the signature block would cross the page-break guard,
 * guaranteeing the whole date/rule/name block stays together on one page.
 */
export function buildPoaLetterPlan(
  data: PoaLetterData,
  font: PDFFont,
  boldFont: PDFFont
): DrawOp[] {
  const ops: DrawOp[] = [];
  let page = 0;
  let cursor = START_TOP;

  const emitLine = (
    text: string,
    size = fontSize,
    bold = false,
    indent = 0
  ): void => {
    ops.push({
      kind: 'text',
      text,
      x: marginLeft + indent,
      yTop: cursor,
      size,
      bold,
      page,
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

  // Wraps `text` to `width`, choosing font metrics per line so mixed
  // bold/regular content (bullets) wraps against the correct widths.
  const emitSegmentedLine = (segments: TextSegment[], indent: number): void => {
    ops.push({
      kind: 'text',
      text: segments.map((s) => s.text).join(''),
      segments,
      x: marginLeft + indent,
      yTop: cursor,
      size: fontSize,
      page,
    });
    cursor += lineHeight;
  };

  // Title (bold). Wrap only if it would overflow the content width.
  const titleLines = wrapText(TITLE, boldFont, TITLE_SIZE, maxWidth);
  for (const line of titleLines) {
    emitLine(line, TITLE_SIZE, true);
  }
  emitBlank();

  // Vollmachtgeber block — one field per line, heading bold.
  emitLine('Vollmachtgeber:', fontSize, true);
  emitLine(`Vorname: ${data.firstName}`);
  emitLine(`Nachname: ${data.lastName}`);
  emitLine(`Anschrift: ${data.streetAddress}, ${data.postalCode} ${data.city}`);
  emitLine(`Geburtsdatum: ${data.dateOfBirth}`);
  emitLine(`Geburtsort: ${data.placeOfBirth}`);
  emitLine(`VBL-Versicherungsnummer / Aktenzeichen: ${data.vblReference}`);
  emitBlank();

  // Bevollmächtigte block — built from POA_HOLDER constants.
  emitLine('Bevollmächtigte:', fontSize, true);
  emitLine(`Vorname: ${POA_HOLDER.firstNames}`);
  emitLine(`Nachname: ${POA_HOLDER.lastNameWithBirth}`);
  emitLine(`Anschrift: ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity}`);
  emitBlank();

  // Grant-of-authority paragraph.
  emitParagraph(
    `Hiermit erteile ich, ${data.firstName} ${data.lastName}, geboren am ${data.dateOfBirth} in ${data.placeOfBirth} und wohnhaft in ${data.streetAddress}, ${data.postalCode} ${data.city} (nachfolgend „Vollmachtgeber" genannt), der ${POA_HOLDER.nameWithBirthName}, geboren am ${POA_HOLDER.birthDate} in ${POA_HOLDER.birthPlace} und wohnhaft in ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity} (nachfolgend „Bevollmächtigte" genannt), die Vollmacht, alle Post der VBL in meinem Namen entgegenzunehmen und zu verwalten sowie die im Zusammenhang mit meinem Beitragserstattungsverfahren erforderliche Korrespondenz mit der VBL zu führen.`
  );
  emitBlank();

  // Scope of authority — bold heading, intro, then bold-lead-in bullets.
  emitLine('Umfang der Vollmacht:', fontSize, true);
  emitParagraph(
    'Die Bevollmächtigte ist berechtigt, folgende Handlungen in meinem Namen vorzunehmen:'
  );
  emitBlank();
  for (const bullet of BULLETS) {
    emitBullet(bullet, boldFont, font, emitSegmentedLine);
  }
  emitBlank();

  // Validity paragraph.
  emitParagraph(
    `Diese Vollmacht ist ab dem ${data.dateToday} gültig und bleibt bis zum Abschluss des Beitragserstattungsverfahrens bzw. bis auf schriftlichen Widerruf durch den Vollmachtgeber bestehen. Anschließend soll alle Post wieder direkt an den Vollmachtgeber zugestellt werden.`
  );
  emitBlank();

  // Date row: "{city}, {dateToday}" on the left. Prefer a signature beside
  // it, but move the signature to the next row if less than 60pt remains in
  // the left half; never move it back over the date.
  const dateLineText = `${data.city}, ${data.dateToday}`;
  const dateWidth = font.widthOfTextAtSize(dateLineText, fontSize);
  const desiredSignatureX = marginLeft + dateWidth + SIGNATURE_GAP;
  const leftHalfRight = A4.width / 2;
  const sharedRowMaxWidth = leftHalfRight - desiredSignatureX;
  const signatureOnSecondRow = sharedRowMaxWidth < MIN_SIGNATURE_WIDTH;
  const signatureX = signatureOnSecondRow ? marginLeft : desiredSignatureX;
  const signatureMaxWidth = signatureOnSecondRow
    ? leftHalfRight - marginLeft
    : sharedRowMaxWidth;

  const signatureTopOffset = signatureOnSecondRow
    ? lineHeight + SIGNATURE_ROW_GAP
    : -(signatureImageHeight - lineHeight) / 2;
  const signatureBlockHeight =
    signatureTopOffset + signatureImageHeight + lineHeight / 2 + lineHeight * 2;
  // Keep the whole signature block (date, signature, rule, and name)
  // together. The second-row signature begins after the full date line plus
  // an explicit visual gap, and all following elements derive from its box.
  if (cursor + signatureBlockHeight > PAGE_BREAK_GUARD) {
    page += 1;
    cursor = START_TOP;
  }

  ops.push({
    kind: 'text',
    text: dateLineText,
    x: marginLeft,
    yTop: cursor,
    size: fontSize,
    page,
  });
  ops.push({
    kind: 'signature',
    x: signatureX,
    yTop: cursor + signatureTopOffset,
    height: signatureImageHeight,
    maxWidth: signatureMaxWidth,
    page,
  });
  cursor += signatureTopOffset + signatureImageHeight + lineHeight / 2;

  // Horizontal rule spanning the content width.
  ops.push({
    kind: 'rule',
    x: marginLeft,
    yTop: cursor,
    width: maxWidth,
    page,
  });
  cursor += lineHeight;

  emitLine(
    `Unterschrift des Vollmachtgebers (${data.firstName} ${data.lastName})`
  );

  return ops;
}

/**
 * Width reservation for the signature image. The exact rendered width
 * depends on the PNG aspect ratio and is capped by the draw operation.
 */
export function getPoaSignatureReservedWidth(): number {
  return signatureImageHeight * 3;
}

/**
 * Emits one bullet as bold-lead-in + regular body, wrapped to the bullet
 * content width. The bullet dot prefixes the first line; continuation
 * lines are hanging-indented to align under the text.
 */
function emitBullet(
  bullet: { lead: string; body: string },
  boldFont: PDFFont,
  font: PDFFont,
  emitSegmentedLine: (segments: TextSegment[], indent: number) => void
): void {
  const bulletMaxWidth = maxWidth - BULLET_INDENT;
  // Tokenize into words tagged with their font weight, preserving the
  // bold lead-in / regular body boundary.
  type Token = { text: string; bold: boolean };
  const tokens: Token[] = [];
  for (const w of bullet.lead.split(/\s+/).filter(Boolean)) {
    tokens.push({ text: w, bold: true });
  }
  for (const w of bullet.body.split(/\s+/).filter(Boolean)) {
    tokens.push({ text: w, bold: false });
  }

  const widthOf = (t: Token): number =>
    (t.bold ? boldFont : font).widthOfTextAtSize(t.text, fontSize);
  const spaceWidth = font.widthOfTextAtSize(' ', fontSize);

  let lineTokens: Token[] = [];
  let lineWidth = 0;
  let isFirstLine = true;

  const flush = (): void => {
    const segments = tokensToSegments(lineTokens);
    const prefix: TextSegment | null = isFirstLine
      ? { text: BULLET_PREFIX, bold: false }
      : null;
    emitSegmentedLine(prefix ? [prefix, ...segments] : segments, BULLET_INDENT);
    isFirstLine = false;
    lineTokens = [];
    lineWidth = 0;
  };

  for (const token of tokens) {
    const w = widthOf(token);
    const addWidth = lineTokens.length === 0 ? w : spaceWidth + w;
    if (lineTokens.length > 0 && lineWidth + addWidth > bulletMaxWidth) {
      flush();
      lineTokens = [token];
      lineWidth = w;
    } else {
      lineTokens.push(token);
      lineWidth += addWidth;
    }
  }
  if (lineTokens.length > 0) flush();
}

/**
 * Collapses adjacent same-weight tokens into segments, joining words with
 * single spaces. A leading space is added between a bold run and the
 * following regular run so "Korrespondenz:" and its body don't touch.
 */
function tokensToSegments(
  tokens: { text: string; bold: boolean }[]
): TextSegment[] {
  const segments: TextSegment[] = [];
  tokens.forEach((token, i) => {
    const sep = i === 0 ? '' : ' ';
    const last = segments[segments.length - 1];
    if (last && last.bold === token.bold) {
      last.text += `${sep}${token.text}`;
    } else {
      segments.push({ text: `${sep}${token.text}`, bold: token.bold });
    }
  });
  return segments;
}

/** Adds the Postempfangsvollmacht letter (1–2 A4 pages) to `doc`. */
export async function renderPoaLetter(
  doc: PDFDocument,
  data: PoaLetterData
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const signatureImage = await doc.embedPng(data.signaturePng);

  const plan = buildPoaLetterPlan(data, font, boldFont);
  const pageCount = plan.reduce((max, op) => Math.max(max, op.page), 0) + 1;
  const pages = Array.from({ length: pageCount }, () =>
    doc.addPage([A4.width, A4.height])
  );

  for (const op of plan) {
    const page = pages[op.page];
    if (op.kind === 'text') {
      // op.yTop is a pdftotext yMin (the top of the glyph box), which sits
      // one font ascent above the baseline — not one fontSize above it.
      const drawFont = op.bold ? boldFont : font;
      const ascent = drawFont.heightAtSize(op.size, { descender: false });
      const baselineY = A4.height - op.yTop - ascent;
      if (op.segments && op.segments.length > 0) {
        // Draw each run sequentially, advancing x by its measured width.
        let x = op.x;
        for (const seg of op.segments) {
          const segFont = seg.bold ? boldFont : font;
          page.drawText(seg.text, {
            x,
            y: baselineY,
            size: op.size,
            font: segFont,
          });
          x += segFont.widthOfTextAtSize(seg.text, op.size);
        }
      } else {
        page.drawText(op.text, {
          x: op.x,
          y: baselineY,
          size: op.size,
          font: drawFont,
        });
      }
    } else if (op.kind === 'signature') {
      const scale = op.height / signatureImage.height;
      let width = signatureImage.width * scale;
      let height = op.height;
      if (width > op.maxWidth) {
        const maxWidthScale = op.maxWidth / width;
        width *= maxWidthScale;
        height *= maxWidthScale;
      }
      // Keep the signature within the right margin: if the scaled image is
      // wider than the reserved slot, nudge it left so it doesn't clip.
      const maxX = A4.width - marginRight - width;
      const adjustedTop = op.yTop + (op.height - height) / 2;
      page.drawImage(signatureImage, {
        x: Math.min(op.x, maxX),
        y: A4.height - adjustedTop - height,
        width,
        height,
      });
    } else {
      // Horizontal rule.
      page.drawLine({
        start: { x: op.x, y: A4.height - op.yTop },
        end: { x: op.x + op.width, y: A4.height - op.yTop },
        thickness: 0.75,
      });
    }
  }
}
