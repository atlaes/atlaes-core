import { describe, it, expect, vi } from 'vitest';
import { PDFDocument, PDFPage, StandardFonts } from 'pdf-lib';
import {
  buildPoaText,
  buildPoaLetterPlan,
  getPoaSignatureReservedWidth,
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

const WIDE_SIGNATURE_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAoAAAABCAYAAADn9T9+AAAAD0lEQVR4nGPg5+f/TwwGAOJVC7n30JYcAAAAAElFTkSuQmCC'
  ),
  (c) => c.charCodeAt(0)
);
const OPAQUE_SIGNATURE_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPg5+f/DwABiwEtiDsVSQAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
);
const FALLBACK_CITY =
  'Eine außerordentlich lange Ortsbezeichnung für die gezwungene zweite Signaturzeile';

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
        op.kind === 'text' && op.bold && op.text.includes('Empfangsvollmacht')
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

  it('places the signature beside the date in the left half of the page', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(data, font, boldFont);
    const date = plan.find(
      (op) => op.kind === 'text' && op.text === 'Berlin, 06.07.2026'
    );
    const signature = plan.find((op) => op.kind === 'signature');

    expect(date).toBeDefined();
    expect(signature).toBeDefined();
    if (
      !date ||
      date.kind !== 'text' ||
      !signature ||
      signature.kind !== 'signature'
    ) {
      throw new Error('missing date or signature operation');
    }

    const dateWidth = font.widthOfTextAtSize(date.text, date.size);
    expect(signature.x).toBeGreaterThanOrEqual(date.x + dateWidth + 16);
    expect(signature.maxWidth).toBeCloseTo(A4.width / 2 - signature.x, 3);
    expect(getPoaSignatureReservedWidth()).toBe(signature.height * 3);
    expect(signature.page).toBe(date.page);
  });

  it('keeps long city dates clear of the signature and uses a second row when needed', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const cases = [
      { city: 'Metro Manila', separateRow: false },
      { city: 'Frankfurt am Main', separateRow: false },
      {
        city: FALLBACK_CITY,
        separateRow: true,
      },
    ];

    for (const { city, separateRow } of cases) {
      const plan = buildPoaLetterPlan({ ...data, city }, font, boldFont);
      const date = plan.find(
        (op) => op.kind === 'text' && op.text === `${city}, 06.07.2026`
      );
      const signature = plan.find((op) => op.kind === 'signature');
      const rule = plan.find((op) => op.kind === 'rule');
      const name = plan.find(
        (op) =>
          op.kind === 'text' &&
          op.text.startsWith('Unterschrift des Vollmachtgebers')
      );

      expect(date && signature && rule && name).toBeTruthy();
      if (
        !date ||
        date.kind !== 'text' ||
        !signature ||
        signature.kind !== 'signature' ||
        !rule ||
        rule.kind !== 'rule' ||
        !name ||
        name.kind !== 'text'
      ) {
        throw new Error('missing signature block operations');
      }

      const dateWidth = font.widthOfTextAtSize(date.text, date.size);
      expect(signature.page).toBe(date.page);
      expect(rule.page).toBe(signature.page);
      expect(name.page).toBe(signature.page);
      expect(signature.x + signature.maxWidth).toBeLessThanOrEqual(
        A4.width / 2
      );
      expect(rule.yTop).toBeGreaterThan(signature.yTop + signature.height);
      expect(name.yTop).toBeGreaterThan(rule.yTop);
      expect(plan.reduce((max, op) => Math.max(max, op.page), 0)).toBe(0);

      if (separateRow) {
        expect(signature.yTop).toBeGreaterThanOrEqual(
          date.yTop + COVER_LAYOUT.lineHeight + 4
        );
      } else {
        expect(signature.x).toBeGreaterThanOrEqual(date.x + dateWidth + 16);
        expect(signature.yTop).toBeLessThan(date.yTop);
      }
    }
  });

  it('renders an opaque fallback signature below the date line and above the rule', async () => {
    const planDoc = await PDFDocument.create();
    const font = await planDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await planDoc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(
      { ...data, city: FALLBACK_CITY },
      font,
      boldFont
    );
    const date = plan.find(
      (op) => op.kind === 'text' && op.text === `${FALLBACK_CITY}, 06.07.2026`
    );
    const signature = plan.find((op) => op.kind === 'signature');
    const rule = plan.find((op) => op.kind === 'rule');
    const name = plan.find(
      (op) =>
        op.kind === 'text' &&
        op.text.startsWith('Unterschrift des Vollmachtgebers')
    );
    expect(date && signature && rule && name).toBeTruthy();
    if (
      !date ||
      date.kind !== 'text' ||
      !signature ||
      signature.kind !== 'signature' ||
      !rule ||
      rule.kind !== 'rule' ||
      !name ||
      name.kind !== 'text'
    ) {
      throw new Error('missing fallback signature block operations');
    }

    expect(signature.yTop).toBeGreaterThanOrEqual(
      date.yTop + COVER_LAYOUT.lineHeight + 4
    );
    expect(signature.x + signature.maxWidth).toBeLessThanOrEqual(A4.width / 2);
    expect(rule.yTop).toBeGreaterThan(signature.yTop + signature.height);
    expect(name.yTop).toBeGreaterThan(rule.yTop);
    expect(signature.page).toBe(date.page);
    expect(rule.page).toBe(signature.page);
    expect(name.page).toBe(signature.page);

    const renderDoc = await PDFDocument.create();
    const drawImage = vi.spyOn(PDFPage.prototype, 'drawImage');
    try {
      await renderPoaLetter(renderDoc, {
        ...data,
        city: FALLBACK_CITY,
        signaturePng: OPAQUE_SIGNATURE_PNG,
      });
      const options = drawImage.mock.calls[0]?.[1];
      expect(options).toBeDefined();
      if (!options) throw new Error('opaque fallback signature was not drawn');

      const renderedTop = A4.height - options.y - options.height;
      expect(renderedTop).toBeCloseTo(signature.yTop, 3);
      expect(options.x + options.width).toBeLessThanOrEqual(A4.width / 2);
      expect(renderDoc.getPageCount()).toBe(1);
    } finally {
      drawImage.mockRestore();
    }
  });

  it('scales a wide signature inside its box while keeping it vertically centered', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildPoaLetterPlan(data, font, boldFont);
    const signature = plan.find((op) => op.kind === 'signature');
    expect(signature).toBeDefined();
    if (!signature || signature.kind !== 'signature') {
      throw new Error('missing signature operation');
    }

    const drawImage = vi.spyOn(PDFPage.prototype, 'drawImage');
    try {
      await renderPoaLetter(doc, { ...data, signaturePng: WIDE_SIGNATURE_PNG });
      const options = drawImage.mock.calls[0]?.[1];
      expect(options).toBeDefined();
      if (!options) throw new Error('signature image was not drawn');

      expect(options.width / options.height).toBeCloseTo(10, 3);
      expect(options.x + options.width).toBeLessThanOrEqual(A4.width / 2);
      const renderedTop = A4.height - options.y - options.height;
      expect(renderedTop + options.height / 2).toBeCloseTo(
        signature.yTop + signature.height / 2,
        3
      );
    } finally {
      drawImage.mockRestore();
    }
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
