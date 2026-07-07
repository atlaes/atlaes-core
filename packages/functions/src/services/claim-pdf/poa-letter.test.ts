import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  buildPoaText,
  buildPoaLetterPlan,
  renderPoaLetter,
} from './poa-letter';
import { A4, COVER_LAYOUT } from './constants';

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

  it('lays out each field on its own line (no run-on paragraphs)', () => {
    const lines = buildPoaText(data).split('\n');
    expect(lines).toContain('Vollmachtgeber:');
    expect(lines).toContain('Vorname: Juan');
    expect(lines).toContain('Nachname: Dela Cruz');
    expect(lines).toContain('Anschrift: Musterstraße 1, 12345 Berlin');
    expect(lines).toContain('Geburtsdatum: 01.01.1990');
    expect(lines).toContain('Geburtsort: Manila');
    expect(lines).toContain(
      'VBL-Versicherungsnummer / Aktenzeichen: AB12334567'
    );
    expect(lines).toContain('Bevollmächtigte:');
    expect(lines).toContain('Vorname: Anna Katharina Charlotte');
    expect(lines).toContain('Nachname: Kliem (geb. Böckers)');
    expect(lines).toContain('Umfang der Vollmacht:');
    // The old run-on "Vollmachtgeber: Vorname: X Nachname: Y ..." is gone.
    expect(
      lines.some((l) => /Vollmachtgeber:.*Vorname:.*Nachname:/.test(l))
    ).toBe(false);
  });

  it('renders bold headings as their own draw ops', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(data, font, boldFont);
    const boldTexts = plan
      .filter((op) => op.kind === 'text' && op.bold)
      .map((op) => (op.kind === 'text' ? op.text : ''));
    expect(boldTexts).toContain('Vollmachtgeber:');
    expect(boldTexts).toContain('Bevollmächtigte:');
    expect(boldTexts).toContain('Umfang der Vollmacht:');
  });

  it('keeps the bold title within the page margins (no overflow)', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(data, font, boldFont);
    const contentRight = A4.width - COVER_LAYOUT.marginRight;
    const titleOps = plan.filter(
      (op) =>
        op.kind === 'text' &&
        op.bold &&
        op.text.includes('Empfangsvollmacht')
    );
    // The title should be present and every title line must fit within the
    // right margin (measured with the bold font at its rendered size).
    expect(titleOps.length).toBeGreaterThanOrEqual(1);
    for (const op of titleOps) {
      if (op.kind !== 'text') continue;
      const w = boldFont.widthOfTextAtSize(op.text, op.size);
      expect(op.x + w).toBeLessThanOrEqual(contentRight + 0.5);
    }
  });

  it('renders bullets with a bold lead-in segment', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(data, font, boldFont);
    const bulletOp = plan.find(
      (op) =>
        op.kind === 'text' &&
        !!op.segments &&
        op.segments.some((s) => s.bold && s.text.includes('Annahme von'))
    );
    expect(bulletOp).toBeDefined();
    if (!bulletOp || bulletOp.kind !== 'text' || !bulletOp.segments) {
      throw new Error('no bullet op');
    }
    // First (non-prefix) bold segment is the lead-in; a regular body run
    // follows.
    expect(bulletOp.segments.some((s) => s.bold)).toBe(true);
    expect(bulletOp.segments.some((s) => !s.bold)).toBe(true);
  });

  it('draws a horizontal rule under the signature/date row', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(data, font, boldFont);
    const rule = plan.find((op) => op.kind === 'rule');
    expect(rule).toBeDefined();
    if (!rule || rule.kind !== 'rule') throw new Error('no rule');
    expect(rule.x).toBeCloseTo(COVER_LAYOUT.marginLeft, 3);
    expect(rule.width).toBeCloseTo(
      A4.width - COVER_LAYOUT.marginLeft - COVER_LAYOUT.marginRight,
      3
    );
  });

  it('keeps the signature block (date, rule, name) on one page', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(data, font, boldFont);
    const dateOp = plan.find(
      (op) => op.kind === 'text' && op.text === 'Berlin, 06.07.2026'
    );
    const rule = plan.find((op) => op.kind === 'rule');
    const nameOp = plan.find(
      (op) =>
        op.kind === 'text' &&
        op.text.startsWith('Unterschrift des Vollmachtgebers')
    );
    expect(dateOp && rule && nameOp).toBeTruthy();
    expect(dateOp!.page).toBe(rule!.page);
    expect(rule!.page).toBe(nameOp!.page);
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
