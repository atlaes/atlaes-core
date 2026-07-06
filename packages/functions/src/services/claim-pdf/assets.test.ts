import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadL203Template, loadPoaHolderId } from './assets';

describe('claim-pdf assets', () => {
  it('loads the blank L203 form with 3 A4 pages and AcroForm fields', async () => {
    const doc = await PDFDocument.load(loadL203Template());
    expect(doc.getPageCount()).toBe(3);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.3, 0);
    expect(height).toBeCloseTo(841.9, 0);
    const names = doc.getForm().getFields().map((f) => f.getName());
    expect(names).toContain(
      'topmostSubform[0].Page1[0].versicherungsnummer[0]'
    );
  });

  it('loads the PoA holder ID as a 1-page A4 PDF', async () => {
    const doc = await PDFDocument.load(loadPoaHolderId());
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.2, 0);
    expect(height).toBeCloseTo(841.8, 0);
  });
});
