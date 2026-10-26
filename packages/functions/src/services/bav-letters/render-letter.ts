/**
 * Renders rendered bAV letter text (output of the template engine) into
 * A4 pages of a pdf-lib document.
 *
 * The text is treated line by line: every line is a line, an empty line is
 * a paragraph gap, long lines wrap at the right margin. A line consisting
 * solely of SIGNATURE_MARKER is replaced by the signature image. The
 * subject line ("Antrag auf …") and the document titles of the powers of
 * attorney are set in bold. Pages break automatically.
 *
 * Geometry follows the DIN 5008 Typ B margins the VBL cover letter uses
 * (see claim-pdf/constants.ts); on a page with a letterhead the body starts
 * below LETTERHEAD_BODY_TOP so the letterhead's own header area stays free.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';
import { A4, COVER_LAYOUT } from '../claim-pdf/constants';
import { wrapText } from '../claim-pdf/text-layout';

/** Put this on its own line where the signature image should be drawn. */
export const SIGNATURE_MARKER = '⁣SIGNATURE⁣';

export interface RenderLetterOptions {
  text: string;
  /** PNG bytes of the drawn signature; required when the text contains SIGNATURE_MARKER. */
  signaturePng?: Uint8Array;
  /** First page of this PDF is embedded as the background of page one. */
  letterheadPdf?: Uint8Array;
  /** Optional title lines (exact match after trim) set in bold. */
  boldLines?: readonly string[];
  now?: Date;
}

export interface RenderedLetter {
  pageCount: number;
}

const LAYOUT = {
  marginLeft: COVER_LAYOUT.marginLeft,
  marginRight: COVER_LAYOUT.marginRight,
  /** Body start on a plain page (top-origin, pt). */
  bodyTop: 68,
  /** Body start on the letterhead page; leaves the top ~55 mm free. */
  letterheadBodyTop: 160,
  bottom: 60,
  fontSize: 11,
  lineHeight: 13.8,
  paragraphGap: 8,
  titleFontSize: 13,
  signatureHeight: 40,
} as const;

const SUBJECT_PREFIXES = ['Antrag auf Abfindung'];
const DEFAULT_BOLD_LINES = ['Postempfangsvollmacht', 'Vollmacht', 'Anlagen'];

// WinAnsi (the encoding of pdf-lib's standard Helvetica) covers Latin-1
// plus the 0x80–0x9F specials. Anything else is reduced to its base letter
// (NFD, combining marks dropped) or, failing that, to "?", so an unusual
// character in a name or address never aborts the whole package.
const WIN_ANSI_SPECIALS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));

export function toWinAnsiSafe(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (
      code < 0x80 ||
      (code >= 0xa0 && code <= 0xff) ||
      WIN_ANSI_SPECIALS.has(ch)
    ) {
      out += ch;
      continue;
    }
    const stripped = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const base = stripped.codePointAt(0) ?? 0;
    if (
      stripped.length > 0 &&
      (base < 0x80 || (base >= 0xa0 && base <= 0xff))
    ) {
      out += stripped[0];
    } else {
      out += '?';
    }
  }
  return out;
}

interface Cursor {
  page: PDFPage;
  yTop: number;
  pageCount: number;
}

export async function renderLetterPages(
  doc: PDFDocument,
  options: RenderLetterOptions
): Promise<RenderedLetter> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const signatureImage = options.signaturePng
    ? await doc.embedPng(options.signaturePng)
    : null;
  const letterhead = options.letterheadPdf
    ? await embedLetterhead(doc, options.letterheadPdf)
    : null;

  const maxWidth = A4.width - LAYOUT.marginLeft - LAYOUT.marginRight;
  const boldLines = new Set([
    ...DEFAULT_BOLD_LINES,
    ...(options.boldLines ?? []),
  ]);
  let subjectDone = false;

  const newPage = (first: boolean): { page: PDFPage; yTop: number } => {
    const page = doc.addPage([A4.width, A4.height]);
    if (first && letterhead) {
      page.drawPage(letterhead, {
        x: 0,
        y: 0,
        width: A4.width,
        height: A4.height,
      });
      return { page, yTop: LAYOUT.letterheadBodyTop };
    }
    return { page, yTop: LAYOUT.bodyTop };
  };

  const firstPage = newPage(true);
  const cursor: Cursor = {
    page: firstPage.page,
    yTop: firstPage.yTop,
    pageCount: 1,
  };

  const ensureSpace = (needed: number) => {
    if (cursor.yTop + needed > A4.height - LAYOUT.bottom) {
      const next = newPage(false);
      cursor.page = next.page;
      cursor.yTop = next.yTop;
      cursor.pageCount += 1;
    }
  };

  const drawLine = (text: string, useFont: PDFFont, size: number) => {
    ensureSpace(LAYOUT.lineHeight);
    const ascent = useFont.heightAtSize(size, { descender: false });
    cursor.page.drawText(text, {
      x: LAYOUT.marginLeft,
      y: A4.height - cursor.yTop - ascent,
      size,
      font: useFont,
    });
    cursor.yTop += LAYOUT.lineHeight;
  };

  const lines = options.text.replace(/\r\n?/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === SIGNATURE_MARKER) {
      if (!signatureImage) {
        throw new Error(
          'Letter text contains a signature slot but no signature was provided'
        );
      }
      ensureSpace(LAYOUT.signatureHeight + 4);
      const scale = LAYOUT.signatureHeight / signatureImage.height;
      const width = Math.min(signatureImage.width * scale, maxWidth);
      cursor.page.drawImage(signatureImage, {
        x: LAYOUT.marginLeft,
        y: A4.height - cursor.yTop - LAYOUT.signatureHeight,
        width,
        height: LAYOUT.signatureHeight,
      });
      cursor.yTop += LAYOUT.signatureHeight + 4;
      continue;
    }

    if (line === '') {
      cursor.yTop += LAYOUT.paragraphGap;
      continue;
    }

    const trimmed = line.trim();
    let useFont: PDFFont = font;
    let size: number = LAYOUT.fontSize;
    if (!subjectDone && SUBJECT_PREFIXES.some((p) => trimmed.startsWith(p))) {
      useFont = boldFont;
      subjectDone = true;
    } else if (boldLines.has(trimmed)) {
      useFont = boldFont;
      if (trimmed !== 'Anlagen') size = LAYOUT.titleFontSize;
    }

    const safe = toWinAnsiSafe(line);
    // Keep the PEV's two-column signature line (multiple spaces) intact:
    // wrapText collapses runs of spaces, so only wrap when needed.
    if (useFont.widthOfTextAtSize(safe, size) <= maxWidth) {
      drawLine(safe, useFont, size);
      continue;
    }
    for (const wrapped of wrapText(safe, useFont, size, maxWidth)) {
      drawLine(wrapped, useFont, size);
    }
  }

  return { pageCount: cursor.pageCount };
}

async function embedLetterhead(doc: PDFDocument, bytes: Uint8Array) {
  const source = await PDFDocument.load(bytes);
  const [page] = await doc.embedPdf(source, [0]);
  return page;
}

/** Renders one letter into a fresh PDF and returns its bytes. */
export async function renderLetterPdf(
  options: RenderLetterOptions
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const doc = await PDFDocument.create();
  const { pageCount } = await renderLetterPages(doc, options);
  return { bytes: await doc.save(), pageCount };
}
