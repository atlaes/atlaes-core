import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { loadLawFirmLetterhead } from './law-firm-config';
import { assembleBavPackage } from './package';
import { renderLetterPdf, SIGNATURE_MARKER } from './render-letter';
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
      templateId: 'B-LAW',
      letterText: `Antrag auf Abfindung\n\n${longBody}`,
      powerOfAttorneyText: `Vollmacht\n\nText\n\n${SIGNATURE_MARKER}`,
      signaturePng: TINY_PNG,
      letterheadPdf: letterhead,
      files: {
        pension_statement: {
          bytes: (await renderLetterPdf({ text: 'Standmitteilung' })).bytes,
          fileType: 'application/pdf',
        },
        passport: { bytes: TINY_PNG, fileType: 'image/png' },
      },
    });
    expect(result.letterPageCount).toBeGreaterThanOrEqual(2);
    const doc = await PDFDocument.load(result.bytes);
    // Page 1 carries the letterhead form XObject, page 2 of the letter none.
    expect(xObjectCount(doc, 0)).toBe(1);
    expect(xObjectCount(doc, 1)).toBe(0);
  });

  it('DIRECT packages ignore the letterhead', async () => {
    const result = await assembleBavPackage({
      templateId: 'B-DIRECT',
      letterText: 'Antrag auf Abfindung\n\nText',
      powerOfAttorneyText: 'Postempfangsvollmacht',
      letterheadPdf: loadLawFirmLetterhead()!,
      files: {
        pension_statement: {
          bytes: (await renderLetterPdf({ text: 'Standmitteilung' })).bytes,
          fileType: 'application/pdf',
        },
        passport: { bytes: TINY_PNG, fileType: 'image/png' },
      },
    });
    const doc = await PDFDocument.load(result.bytes);
    expect(xObjectCount(doc, 0)).toBe(0);
  });
});
