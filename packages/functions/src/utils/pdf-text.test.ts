import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { pdfTextWidth, toPdfText } from './pdf-text';

describe('toPdfText', () => {
  it('keeps German text, typographic quotes, dashes and the euro sign', () => {
    const s = 'Straße „Zürich“ – § 3 Abs. 2 · 1.234,56 € … Türkei';
    expect(toPdfText(s)).toBe(s);
  });

  it('turns tabs and Unicode spaces into a plain space', () => {
    expect(toPdfText('Mabini Street\t12')).toBe('Mabini Street 12');
    expect(toPdfText('10\u2009000\u202fEUR')).toBe('10 000 EUR');
  });

  it('turns line breaks into spaces, or keeps them as \\n when multiline', () => {
    expect(toPdfText('Unit 4\r\nTower B\rWing C')).toBe(
      'Unit 4 Tower B Wing C'
    );
    expect(toPdfText('a\r\nb\u2028c', { multiline: true })).toBe('a\nb\nc');
  });

  it('drops control and zero-width characters', () => {
    expect(toPdfText('\ufeffAnna\u200b\u0000 Kliem\u0007')).toBe('Anna Kliem');
  });

  it('reduces letters outside WinAnsi to their base letter or ?', () => {
    expect(toPdfText('Ağrı İstanbul')).toBe('Agri Istanbul');
    expect(toPdfText('Łódź')).toBe('Lódz');
    expect(toPdfText('東京')).toBe('??');
    // Decomposed accents (e + U+0301) compose back to WinAnsi letters.
    expect(toPdfText('Jose\u0301 Mu\u0308ller')).toBe('José Müller');
    // A combining mark with no composed form is dropped, not "?".
    expect(toPdfText('Ba\u0331d')).toBe('Bad');
  });

  it('handles null and undefined', () => {
    expect(toPdfText(null)).toBe('');
    expect(toPdfText(undefined)).toBe('');
  });

  it('only returns text Helvetica can encode', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const nasty = 'a\tb\u0085c\u00a0d\u2003e\u0019f\u0080g東ł\u200dh';
    expect(() => font.encodeText(nasty)).toThrow(/WinAnsi cannot encode/);
    expect(() => font.encodeText(toPdfText(nasty))).not.toThrow();
    expect(pdfTextWidth(font, nasty, 10)).toBeGreaterThan(0);
  });
});
