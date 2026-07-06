import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  buildPoaText,
  buildPoaLetterPlan,
  renderPoaLetter,
} from './poa-letter';

const data = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  streetAddress: 'Musterstraße 1',
  postalCode: '12345',
  city: 'Berlin',
  dateOfBirth: '01.01.1990',
  placeOfBirth: 'Manila',
  vblReference: 'AB12334567',
  dateToday: '06.07.2026',
  signaturePng: new Uint8Array(), // not used by the text builder
};

describe('poa letter', () => {
  it('substitutes placeholders and leaves no template tags behind', () => {
    const text = buildPoaText(data);
    expect(text).toContain('Juan Dela Cruz');
    expect(text).toContain('06.07.2026');
    expect(text).toContain('AB12334567');
    expect(text).toContain('Kaskelstraße 46');
    expect(text).not.toContain('{{');
  });

  it('builds the Bevollmächtigte block from POA_HOLDER, not literals', () => {
    const text = buildPoaText(data);
    expect(text).toContain('Anna Katharina Charlotte Kliem, geb. Böckers');
    expect(text).toContain('06.05.1983');
    expect(text).toContain('Münster Westfalen');
    expect(text).toContain('10317 Berlin');
  });

  it('renders at least one A4 page without throwing', async () => {
    const doc = await PDFDocument.create();
    // 1x1 transparent PNG
    const png = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      ),
      (c) => c.charCodeAt(0)
    );
    await renderPoaLetter(doc, { ...data, signaturePng: png });
    // Typical data must fit on a single page.
    expect(doc.getPageCount()).toBe(1);
    for (let i = 0; i < doc.getPageCount(); i++) {
      const { width, height } = doc.getPage(i).getSize();
      expect(width).toBeCloseTo(595.28, 1);
      expect(height).toBeCloseTo(841.89, 1);
    }
  });

  it('adds a second page when content would overflow before the signature block', async () => {
    const doc = await PDFDocument.create();
    const png = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      ),
      (c) => c.charCodeAt(0)
    );
    // Long address/name/place values increase wrapped line count, pushing
    // the cursor past the page-break guard before the signature block.
    const stressData = {
      ...data,
      lastName: 'Dela Cruz von und zu Langenhausen-Mittelstädt-Oberndorfer',
      streetAddress:
        'Musterstraße mit einem sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr langen Namen 123456',
      city: 'Eine Stadt mit einem außergewöhnlich langen Namen die weit über eine sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr lange Zeile hinausgeht und noch weiter geht',
      placeOfBirth:
        'Ein Geburtsort mit einem außergewöhnlich langen Namen der auch weit über eine sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr sehr lange Zeile hinausgeht und noch weiter und noch etwas weiter',
      vblReference: 'AB-12334567-XYZ-987654321-QRSTUV-000111222333444555',
      signaturePng: png,
    };

    // Pure assertion: the plan itself must actually cross into a second
    // page (this pins the page-break guard behavior independent of
    // rendering, so deleting the guard fails this test even if pdf-lib's
    // page count were mocked away).
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(stressData, font, boldFont);
    const maxPage = plan.reduce((max, op) => Math.max(max, op.page), 0);
    expect(maxPage).toBe(1);

    await renderPoaLetter(doc, stressData);
    expect(doc.getPageCount()).toBe(2);
  });
});
