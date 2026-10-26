/**
 * Specimen DRV letters for tests and screenshots. Invented people and
 * numbers; never a real client letter. `text` is what the mocked OCR
 * returns, `specimenLetterPdf` renders the same text as a one-page PDF.
 */

import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface SpecimenLetter {
  fileName: string;
  text: string;
}

const HEAD = `Deutsche Rentenversicherung Braunschweig-Hannover
30875 Laatzen

SPECIMEN — TESTDOKUMENT, KEIN ECHTER BESCHEID
`;

export const SPECIMEN_LETTERS = {
  refundDecision: {
    fileName: 'specimen-bescheid-sharma.pdf',
    text: `${HEAD}
Frau
Anita Sharma
c/o Vividius Rechtsanwälte

Ihr Zeichen: 06152-26
Versicherungsnummer: 10 140388 S 501
Datum: 02.10.2026

Bescheid über die Beitragserstattung

Sehr geehrte Frau Sharma,
auf Ihren Antrag erstatten wir Ihnen die Beiträge zur Rentenversicherung.
Erstattungsbetrag: 3.038,49 EUR
`,
  },
  documentRequest: {
    fileName: 'specimen-rueckfrage-okafor.pdf',
    text: `${HEAD}
Herrn
Joseph Okafor

Versicherungsnummer 45020790O213
Laatzen, den 14. September 2026

Rückfrage zu Ihrem Antrag auf Beitragserstattung

Sehr geehrter Herr Okafor,
für die Bearbeitung benötigen wir noch folgende Unterlagen.
Bitte senden Sie uns eine Kopie Ihres Reisepasses.
`,
  },
  rejection: {
    fileName: 'specimen-ablehnung.pdf',
    text: `${HEAD}
Herrn
Joseph Okafor
Versicherungsnummer 45 020790 O 213
Datum: 20.10.2026

Ihr Antrag auf Beitragserstattung wird abgelehnt.
`,
  },
  nameOnly: {
    fileName: 'specimen-name-only.pdf',
    text: `${HEAD}
Frau
Anita Sharma
Datum: 05.10.2026

Eingangsbestätigung — wir haben Ihre Unterlagen erhalten.
`,
  },
  other: {
    fileName: 'specimen-sonstiges.pdf',
    text: `${HEAD}
Datum: 01.10.2026
Allgemeine Information zu unseren Öffnungszeiten.
`,
  },
} satisfies Record<string, SpecimenLetter>;

export async function specimenLetterPdf(text: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  // Fixed dates: the same text always gives the same bytes (dedupe tests).
  pdf.setCreationDate(new Date('2026-10-01T00:00:00Z'));
  pdf.setModificationDate(new Date('2026-10-01T00:00:00Z'));
  pdf.setProducer('ATLAES specimen');
  pdf.setCreator('ATLAES specimen');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  let y = 790;
  for (const line of text.split('\n')) {
    page.drawText(line.replace(/[—–]/g, '-'), { x: 60, y, size: 11, font });
    y -= 16;
  }
  return pdf.save();
}
