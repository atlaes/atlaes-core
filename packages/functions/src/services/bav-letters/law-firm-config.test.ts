import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { loadLawFirmLetterhead } from './law-firm-config';
import { assembleBavPackage } from './package';
import { SIGNATURE_MARKER } from './render-letter';
import { TINY_PNG } from './test-fixtures';

/** Number of XObjects (embedded pages/images) a page references. */
function xObjectCount(doc: PDFDocument, index: number): number {
  const resources = doc.getPage(index).node.Resources();
  const xo = resources?.lookup(PDFName.of('XObject'));
  return xo instanceof PDFDict ? xo.keys().length : 0;
}

describe('law-firm letterhead asset (src/assets/bav/law-firm-letterhead.pdf)', () => {
  it('exists and is one A4 page', async () => {
    const bytes = loadLawFirmLetterhead();
    expect(bytes).not.toBeNull();
    const doc = await PDFDocument.load(bytes!);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
    // Logo (JPEG) embedded on the page.
    expect(xObjectCount(doc, 0)).toBeGreaterThanOrEqual(1);
  });

  it('is drawn on the first page of a LAW package only', async () => {
    const letterhead = loadLawFirmLetterhead()!;
    const longBody = Array.from(
      { length: 70 },
      (_, i) => `Zeile ${i + 1} des Schreibens an den Versorgungsträger.`
    ).join('\n');
    const result = await assembleBavPackage({
      letterText: `Antrag auf Abfindung\n\n${longBody}`,
      authorityText: `Vollmacht\n\nText\n\n${SIGNATURE_MARKER}`,
      signaturePng: TINY_PNG,
      letterheadPdf: letterhead,
      enclosures: [
        { kind: 'voll', label: 'Vollmacht' },
        { kind: 'passport', label: 'Kopie des Reisepasses', documentIndex: 0 },
      ],
      files: new Map([[0, { bytes: TINY_PNG, fileType: 'image/png' }]]),
    });
    expect(result.letterPageCount).toBeGreaterThanOrEqual(2);
    const doc = await PDFDocument.load(result.bytes);
    // Page 1 carries the letterhead form XObject, page 2 of the letter none.
    expect(xObjectCount(doc, 0)).toBe(1);
    expect(xObjectCount(doc, 1)).toBe(0);
  });

  it('packages rendered without a letterhead have none', async () => {
    const result = await assembleBavPackage({
      letterText: 'Antrag auf Abfindung\n\nText',
      authorityText: 'Postempfangsvollmacht',
      enclosures: [
        { kind: 'pev', label: 'Postempfangsvollmacht' },
        { kind: 'passport', label: 'Kopie des Reisepasses', documentIndex: 0 },
      ],
      files: new Map([[0, { bytes: TINY_PNG, fileType: 'image/png' }]]),
    });
    const doc = await PDFDocument.load(result.bytes);
    expect(xObjectCount(doc, 0)).toBe(0);
  });
});
