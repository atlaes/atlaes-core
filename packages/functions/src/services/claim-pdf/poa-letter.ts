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

const BULLETS = [
  'Annahme von Postsendungen: Entgegennahme von Briefen, Paketen und sonstigen Postsendungen der VBL.',
  'Unterschrift bei Annahme: Unterzeichnung von Empfangsbestätigungen und Zustellnachweisen.',
  'Verwaltung der Post: Öffnen und Sortieren der Post sowie Weiterleitung an mich.',
  'Abholung von Postsendungen: Abholung von Postsendungen bei der Poststelle oder einem Paketdienst.',
  'Korrespondenz: Führen der notwendigen Korrespondenz und Kommunikation mit der VBL im Zusammenhang mit meinem Beitragserstattungsverfahren.',
];

/**
 * Builds the full plain-text content of the Postempfangsvollmacht letter
 * (blocks separated by blank lines, bullets prefixed with "• "). This is a
 * pure function purpose-built for placeholder-substitution testing; the
 * actual layout/pagination happens in `buildPoaLetterPlan`.
 */
export function buildPoaText(data: PoaLetterData): string {
  const blocks = [
    TITLE,
    `Vollmachtgeber: Vorname: ${data.firstName} Nachname: ${data.lastName} Anschrift: ${data.streetAddress}, ${data.postalCode} ${data.city} Geburtsdatum: ${data.dateOfBirth} Geburtsort: ${data.placeOfBirth} VBL-Versicherungsnummer / Aktenzeichen: ${data.vblReference}`,
    // Keep in sync with POA_HOLDER in ./constants — no split name fields
    // exist there.
    `Bevollmächtigte: Vorname: Anna Katharina Charlotte Nachname: Kliem (geb. Böckers) Anschrift: ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity}`,
    `Hiermit erteile ich, ${data.firstName} ${data.lastName}, geboren am ${data.dateOfBirth} in ${data.placeOfBirth} und wohnhaft in ${data.streetAddress}, ${data.postalCode} ${data.city} (nachfolgend „Vollmachtgeber" genannt), der ${POA_HOLDER.nameWithBirthName}, geboren am ${POA_HOLDER.birthDate} in ${POA_HOLDER.birthPlace} und wohnhaft in ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity} (nachfolgend „Bevollmächtigte" genannt), die Vollmacht, alle Post der VBL in meinem Namen entgegenzunehmen und zu verwalten sowie die im Zusammenhang mit meinem Beitragserstattungsverfahren erforderliche Korrespondenz mit der VBL zu führen.`,
    'Umfang der Vollmacht: Die Bevollmächtigte ist berechtigt, folgende Handlungen in meinem Namen vorzunehmen:',
    BULLETS.map((b) => `• ${b}`).join('\n'),
    `Diese Vollmacht ist ab dem ${data.dateToday} gültig und bleibt bis zum Abschluss des Beitragserstattungsverfahrens bzw. bis auf schriftlichen Widerruf durch den Vollmachtgeber bestehen. Anschließend soll alle Post wieder direkt an den Vollmachtgeber zugestellt werden.`,
    `${data.city}, ${data.dateToday}`,
    `Unterschrift des Vollmachtgebers (${data.firstName} ${data.lastName})`,
  ];
  return blocks.join('\n\n');
}

export type DrawOp =
  | {
      kind: 'text';
      text: string;
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
      page: number;
    };

const { marginLeft, fontSize, lineHeight, signatureImageHeight } = COVER_LAYOUT;
const maxWidth = A4.width - 2 * marginLeft;
const TITLE_SIZE = 13;
const START_TOP = 80;
const BULLET_PREFIX = '• ';
const BULLET_INDENT = 12;
const PAGE_BREAK_GUARD = A4.height - 120;

/**
 * Builds the Postempfangsvollmacht draw plan as a pure function of the
 * input data and embedded fonts. Coordinates are TOP-origin (`yTop`),
 * following the same idiom as `buildCoverLetterPlan`. `page` is a 0-based
 * index into the pages that `renderPoaLetter` will create; a new page is
 * started whenever the cursor crosses the page-break guard before the
 * signature block, guaranteeing the signature never clips.
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

  const emitBullet = (text: string): void => {
    const bulletMaxWidth = maxWidth - BULLET_INDENT;
    const lines = wrapText(text, font, fontSize, bulletMaxWidth);
    lines.forEach((line, i) => {
      const prefixed = i === 0 ? `${BULLET_PREFIX}${line}` : line;
      emitLine(prefixed, fontSize, false, BULLET_INDENT);
    });
  };

  // Title
  emitLine(TITLE, TITLE_SIZE, true);
  emitBlank();

  // Vollmachtgeber block
  emitParagraph(
    `Vollmachtgeber: Vorname: ${data.firstName} Nachname: ${data.lastName} Anschrift: ${data.streetAddress}, ${data.postalCode} ${data.city} Geburtsdatum: ${data.dateOfBirth} Geburtsort: ${data.placeOfBirth} VBL-Versicherungsnummer / Aktenzeichen: ${data.vblReference}`
  );
  emitBlank();

  // Bevollmächtigte block — built entirely from POA_HOLDER constants.
  // Keep in sync with POA_HOLDER in ./constants — no split name fields
  // exist there.
  emitParagraph(
    `Bevollmächtigte: Vorname: Anna Katharina Charlotte Nachname: Kliem (geb. Böckers) Anschrift: ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity}`
  );
  emitBlank();

  // Grant-of-authority paragraph
  emitParagraph(
    `Hiermit erteile ich, ${data.firstName} ${data.lastName}, geboren am ${data.dateOfBirth} in ${data.placeOfBirth} und wohnhaft in ${data.streetAddress}, ${data.postalCode} ${data.city} (nachfolgend „Vollmachtgeber" genannt), der ${POA_HOLDER.nameWithBirthName}, geboren am ${POA_HOLDER.birthDate} in ${POA_HOLDER.birthPlace} und wohnhaft in ${POA_HOLDER.street}, ${POA_HOLDER.postalCodeCity} (nachfolgend „Bevollmächtigte" genannt), die Vollmacht, alle Post der VBL in meinem Namen entgegenzunehmen und zu verwalten sowie die im Zusammenhang mit meinem Beitragserstattungsverfahren erforderliche Korrespondenz mit der VBL zu führen.`
  );
  emitBlank();

  // Scope of authority
  emitParagraph(
    'Umfang der Vollmacht: Die Bevollmächtigte ist berechtigt, folgende Handlungen in meinem Namen vorzunehmen:'
  );
  for (const bullet of BULLETS) {
    emitBullet(bullet);
  }
  emitBlank();

  // Validity paragraph
  emitParagraph(
    `Diese Vollmacht ist ab dem ${data.dateToday} gültig und bleibt bis zum Abschluss des Beitragserstattungsverfahrens bzw. bis auf schriftlichen Widerruf durch den Vollmachtgeber bestehen. Anschließend soll alle Post wieder direkt an den Vollmachtgeber zugestellt werden.`
  );
  emitBlank();

  // Page-break guard: ensure the signature block never clips.
  if (cursor > PAGE_BREAK_GUARD) {
    page += 1;
    cursor = START_TOP;
  }

  // Signature block: "{city}, {dateToday}" line with the signature image
  // placed to the right, then the printed-name line below.
  const dateLineText = `${data.city}, ${data.dateToday}`;
  ops.push({
    kind: 'text',
    text: dateLineText,
    x: marginLeft,
    yTop: cursor,
    size: fontSize,
    page,
  });
  const dateLineWidth = font.widthOfTextAtSize(dateLineText, fontSize);
  ops.push({
    kind: 'signature',
    x: marginLeft + dateLineWidth + BULLET_INDENT,
    yTop: cursor - (signatureImageHeight - lineHeight) / 2,
    height: signatureImageHeight,
    page,
  });
  cursor += lineHeight;

  emitLine(
    `Unterschrift des Vollmachtgebers (${data.firstName} ${data.lastName})`
  );

  return ops;
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
      page.drawText(op.text, {
        x: op.x,
        y: A4.height - op.yTop - op.size,
        size: op.size,
        font: op.bold ? boldFont : font,
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
