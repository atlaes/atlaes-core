import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { buildCoverLetterPlan, renderCoverLetter } from './cover-letter';
import { A4, COVER_LAYOUT } from './constants';

const data = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  vblReference: 'AB12334567',
  signingPlace: 'Manila',
  dateToday: '06.07.2026',
  signaturePng: new Uint8Array(), // not used by plan builder
};

describe('cover letter', () => {
  it('places the recipient address exactly at the lettershop-approved window position', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildCoverLetterPlan(data, font, bold);
    const line1 = plan.find(
      (op) => op.kind === 'text' && op.text === 'VBL. Kundenservice'
    );
    const line2 = plan.find(
      (op) => op.kind === 'text' && op.text === '76240 Karlsruhe'
    );
    expect(line1).toMatchObject({ x: 68.3, yTop: 166.2, size: 11 });
    expect(line2).toMatchObject({ x: 68.3, yTop: 193.8, size: 11 });
  });

  it('substitutes placeholders and lists all 4 attachments', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const texts = buildCoverLetterPlan(data, font, bold)
      .filter(
        (op): op is Extract<typeof op, { kind: 'text' }> => op.kind === 'text'
      )
      .map((op) => op.text);
    expect(texts).toContain('Manila, den 06.07.2026');
    expect(
      texts.some((t) => t.includes('Versicherungsnummer AB12334567'))
    ).toBe(true);
    expect(texts).toContain('Antrag auf Beitragserstattung');
    expect(texts).toContain('Kopie Reisepass (Vollmachtgeber)');
    expect(texts).toContain('Postempfangsvollmacht');
    expect(
      texts.some((t) =>
        t.startsWith('Kopie Personalausweis der Bevollmächtigten')
      )
    ).toBe(true);
  });

  it('right-aligns the date line flush with the body right margin', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildCoverLetterPlan(data, font, bold);
    const dateOp = plan.find(
      (op) => op.kind === 'text' && op.text === 'Manila, den 06.07.2026'
    );
    expect(dateOp).toBeDefined();
    if (!dateOp || dateOp.kind !== 'text') throw new Error('no date op');
    const rightEdge = A4.width - COVER_LAYOUT.marginRight;
    const width = font.widthOfTextAtSize(dateOp.text, dateOp.size);
    // Right edge of the text lands on the body's right margin.
    expect(dateOp.x + width).toBeCloseTo(rightEdge, 3);
    // And it is genuinely right-aligned (well right of the old centered x).
    expect(dateOp.x).toBeGreaterThan(312.25);
  });

  it('renders a single A4 page without throwing', async () => {
    const doc = await PDFDocument.create();
    // 1x1 transparent PNG
    const png = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      ),
      (c) => c.charCodeAt(0)
    );
    await renderCoverLetter(doc, { ...data, signaturePng: png });
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });
});
