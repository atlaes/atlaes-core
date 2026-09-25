import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  buildCoverLetterPlan,
  clientNameLastFirst,
  formatGermanDateLong,
  renderCoverLetter,
  type CoverLetterInput,
} from './cover-letter';

const base: CoverLetterInput = {
  recipient: {
    carrierName: 'Deutsche Rentenversicherung Bund',
    mailingAddress: ['Abt. Internationales', '10704 Berlin'],
    email: 'drv@drv-bund.de',
  },
  ourRef: '06152-26',
  date: new Date(2026, 8, 21),
  client: { lastName: 'Sharma', firstName: 'Priya' },
  vsnr: '65 120390 S 512',
  anlagen: [
    'Zahlungserklärung (A1310)',
    'Lebensbescheinigung',
    'Rückantwort',
    'Kopie des Reisepasses',
    'eine auf uns lautende Vollmacht',
  ],
};

async function fonts() {
  const doc = await PDFDocument.create();
  return {
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

const texts = (ops: ReturnType<typeof buildCoverLetterPlan>) =>
  ops.filter((o) => o.kind === 'text').map((o) => (o as { text: string }).text);

describe('cover letter plan', () => {
  it('renders template A with address window, reference block and Anlagen', async () => {
    const { font, bold } = await fonts();
    const t = texts(buildCoverLetterPlan(base, font, bold));
    expect(t).toContain('Deutsche Rentenversicherung Bund');
    expect(t).toContain('Abt. Internationales');
    expect(t).toContain('vorab per E-Mail an drv@drv-bund.de');
    expect(t).not.toContain('Per beA');
    expect(t).toContain('Unser Zeichen: 06152-26');
    expect(t).toContain('Berlin, den 21.09.2026');
    expect(t.some((s) => s.includes('Sharma, Priya'))).toBe(true);
    expect(t.some((s) => s.includes('65 120390 S 512'))).toBe(true);
    for (const a of base.anlagen) expect(t).toContain(`•  ${a}`);
    // neutral phrasing: no gendered tokens
    expect(t.join(' ')).not.toMatch(/Herrn|Frau |Mandanten|Mandantin/);
    expect(t.some((s) => s.startsWith('Verbindungsstelle'))).toBe(false);
  });

  it('renders template A-VS additions for a liaison office', async () => {
    const { font, bold } = await fonts();
    const t = texts(
      buildCoverLetterPlan(
        {
          ...base,
          recipient: {
            carrierName: 'Deutsche Rentenversicherung Oldenburg-Bremen',
            mailingAddress: ['26119 Oldenburg'],
            email: 'info@drv-oldenburg-bremen.de',
            beA: true,
            verbindungsstelleCountryDe: 'Australien',
          },
        },
        font,
        bold
      )
    );
    expect(t).toContain('Verbindungsstelle Australien');
    expect(t).toContain('Per beA');
    expect(t).toContain('Vertrag: AUSTRALIEN');
    expect(t).toContain('Verbindungsstelle: AUSTRALIEN');
  });

  it('keeps every op inside the A4 page', async () => {
    const { font, bold } = await fonts();
    for (const op of buildCoverLetterPlan(base, font, bold)) {
      expect(op.x).toBeGreaterThanOrEqual(0);
      expect(op.yTop).toBeGreaterThanOrEqual(0);
      expect(op.yTop).toBeLessThan(841.89);
    }
  });
});

describe('cover letter helpers', () => {
  it('formats dates and names', () => {
    expect(formatGermanDateLong(new Date(2026, 0, 5))).toBe('05.01.2026');
    expect(
      clientNameLastFirst({ lastName: ' Sharma ', firstName: 'Priya' })
    ).toBe('Sharma, Priya');
  });
});

describe('renderCoverLetter', () => {
  it('adds exactly one A4 page with letterhead and signature', async () => {
    const doc = await PDFDocument.create();
    await renderCoverLetter(doc, base);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
    const bytes = await doc.save();
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  });
});
