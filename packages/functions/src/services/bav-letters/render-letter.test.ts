import { PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildBavLetterPlan } from './context';
import {
  MUSTER_2_DIRECT_VESTED_EXPECTED,
  MUSTER_2_LETTER_CLAIM,
  MUSTER_2_OPTIONS,
  TEST_LAW_FIRM_ACCOUNT,
} from './muster-2.fixture';
import {
  HAND_SIGNATURE_SPACE_MARKER,
  renderLetterPdf,
  SIGNATURE_MARKER,
  toWinAnsiSafe,
} from './render-letter';
import { getBavTemplate } from './templates';
import { TINY_PNG } from './test-fixtures';

describe('toWinAnsiSafe', () => {
  it('keeps German text, typographic quotes, dashes and the euro sign', () => {
    const s = 'Straße „Zürich“ – § 3 Abs. 2 · 1.234,56 € … Türkei';
    expect(toWinAnsiSafe(s)).toBe(s);
  });

  it('reduces characters outside WinAnsi to their base letter or ?', () => {
    expect(toWinAnsiSafe('Ağrı İstanbul')).toBe(
      'Agrı? Istanbul'.replace('ı?', '?')
    );
    expect(toWinAnsiSafe('Łódź')).toBe('?ódz');
    expect(toWinAnsiSafe('東京')).toBe('??');
  });
});

describe('renderLetterPdf', () => {
  it('renders the Muster 2 letter with the signature image', async () => {
    const text = MUSTER_2_DIRECT_VESTED_EXPECTED.replace(
      '[Unterschrift]',
      SIGNATURE_MARKER
    );
    const { bytes, pageCount } = await renderLetterPdf({
      text,
      signaturePng: TINY_PNG,
    });
    expect(pageCount).toBeGreaterThanOrEqual(1);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(pageCount);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it('refuses a signature slot without a signature', async () => {
    await expect(
      renderLetterPdf({ text: `Hallo\n${SIGNATURE_MARKER}\nName` })
    ).rejects.toThrow(/signature/);
  });

  it('renders the PEV and VOLL texts as single pages with the signature', async () => {
    const plan = buildBavLetterPlan(
      { ...MUSTER_2_LETTER_CLAIM, lawFirmRef: '06152-26' },
      {
        ...MUSTER_2_OPTIONS,
        lawFirmAccount: TEST_LAW_FIRM_ACCOUNT,
        signatureText: SIGNATURE_MARKER,
      }
    );
    for (const id of ['PEV', 'VOLL'] as const) {
      const { text } = getBavTemplate(id).render(plan.context);
      const { pageCount } = await renderLetterPdf({
        text,
        signaturePng: TINY_PNG,
      });
      expect(pageCount, id).toBeLessThanOrEqual(2);
    }
  });

  it('leaves room for a hand signature and sets small and subject lines', async () => {
    const { pageCount } = await renderLetterPdf({
      text: `Absender · Zeile\n\nAntrag auf Beitragserstattung\n\nMit freundlichen Grüßen\n${HAND_SIGNATURE_SPACE_MARKER}\nName`,
      smallLines: ['Absender · Zeile'],
      subjectLine: 'Antrag auf Beitragserstattung',
    });
    expect(pageCount).toBe(1);
  });

  it('embeds a letterhead page behind page one and starts the body lower', async () => {
    const lh = await PDFDocument.create();
    lh.addPage([595.28, 841.89]).drawText('LETTERHEAD', {
      x: 50,
      y: 800,
      size: 20,
    });
    const letterhead = await lh.save();
    const { bytes, pageCount } = await renderLetterPdf({
      text: 'Kurzer Brief',
      letterheadPdf: letterhead,
    });
    expect(pageCount).toBe(1);
    const doc = await PDFDocument.load(bytes);
    // The embedded page shows up as an XObject on page one.
    const resources = doc.getPage(0).node.Resources();
    expect(resources?.get(PDFName.of('XObject'))).toBeDefined();
  });
});
