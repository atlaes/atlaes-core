import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { wrapText } from './text-layout';

describe('wrapText', () => {
  it('wraps long text into lines that fit maxWidth', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const text =
      'Hiermit erteile ich die Vollmacht, alle Post der VBL in meinem Namen entgegenzunehmen und zu verwalten.';
    const lines = wrapText(text, font, 11, 200);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 11)).toBeLessThanOrEqual(200);
    }
    expect(lines.join(' ')).toBe(text);
  });
  it('keeps explicit newlines', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(wrapText('a\nb', font, 11, 500)).toEqual(['a', 'b']);
  });
});
