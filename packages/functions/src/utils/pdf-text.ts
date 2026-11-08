import type { PDFFont } from 'pdf-lib';

/**
 * Text for pdf-lib's standard fonts (Helvetica), which only encode
 * WinAnsi: Latin-1 plus the 0x80–0x9F specials (€, typographic quotes,
 * dashes, …). `font.widthOfTextAtSize` and `font.encodeText` throw on
 * anything else, a tab included ("WinAnsi cannot encode …"), and one
 * such character in a name or address used to abort the whole package.
 *
 * - tabs and other spacing characters become a plain space;
 * - line breaks become a space, or "\n" with `multiline`;
 * - control and zero-width characters are dropped;
 * - other letters fall back to their base letter (NFD, or a short
 *   table for letters without a decomposition such as ł), then to "?".
 */
const WIN_ANSI_SPECIALS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));

const FALLBACKS: Record<string, string> = {
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  ı: 'i',
  ħ: 'h',
  Ħ: 'H',
  ŧ: 't',
  Ŧ: 'T',
  ŀ: 'l',
  Ŀ: 'L',
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '−': '-',
  '′': "'",
  '″': '"',
};

const LINE_BREAKS = /\r\n|[\r\n\v\f\u0085\u2028\u2029]/g;
// Tab plus the Unicode space characters WinAnsi lacks (en/em spaces,
// thin and narrow no-break spaces, ideographic space, …).
const SPACES = /[\t\u1680\u2000-\u200a\u202f\u205f\u3000]/g;
// C0/C1 controls (except \n, handled above), DEL, zero-width characters,
// bidi marks and the BOM.
const DROPPED =
  /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g;

function isWinAnsi(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x20 && code < 0x7f) ||
    (code >= 0xa0 && code <= 0xff) ||
    WIN_ANSI_SPECIALS.has(ch)
  );
}

export function toPdfText(
  text: string | null | undefined,
  options: { multiline?: boolean } = {}
): string {
  if (!text) return '';
  const normalised = text
    .replace(LINE_BREAKS, options.multiline ? '\n' : ' ')
    .replace(SPACES, ' ')
    .replace(DROPPED, '');
  let out = '';
  for (const ch of normalised) {
    if (ch === '\n' || isWinAnsi(ch)) {
      out += ch;
      continue;
    }
    const mapped = FALLBACKS[ch];
    if (mapped) {
      out += mapped;
      continue;
    }
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0];
    out += base && isWinAnsi(base) ? base : '?';
  }
  return out;
}

/** `font.widthOfTextAtSize` that never throws on unencodable text. */
export function pdfTextWidth(
  font: PDFFont,
  text: string,
  size: number
): number {
  return font.widthOfTextAtSize(toPdfText(text), size);
}
