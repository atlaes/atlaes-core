import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { A4 } from './constants';
import {
  assembleClaimPdf,
  toPoaStreetAddress,
  ClaimPdfInput,
} from './assemble';

// 1x1 transparent PNG (same fixture used across claim-pdf tests).
const PNG_1X1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
);

async function buildNonA4Pdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US-Letter, not A4
  page.drawRectangle({ x: 0, y: 0, width: 1, height: 1 });
  return doc.save();
}

const claim: ClaimPdfInput['claim'] = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  dateOfBirth: '1990-03-05',
  placeOfBirth: 'Manila',
  currentAddressLine1: 'Mabini Street 12',
  currentAddressLine2: null,
  currentCity: 'Manila',
  currentPostalCode: '1000',
  currentCountry: 'Philippines',
  svNummer: 'AB12334567',
  iban: 'DE89370400440532013000',
  swiftBic: 'COBADEFFXXX',
  accountHolderName: null,
  bankName: 'Commerzbank',
  bankCity: 'Berlin',
};

describe('assembleClaimPdf', () => {
  it('assembles cover + L203 (3p) + PoA + passport(image) + PoA-holder ID = 7 pages, all A4, no form fields', async () => {
    const bytes = await assembleClaimPdf({
      claim,
      signaturePng: PNG_1X1,
      passport: { bytes: PNG_1X1, fileType: 'image/png' },
      now: new Date('2026-07-06T00:00:00Z'),
    });

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(7);
    expect(doc.getForm().getFields().length).toBe(0);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBeCloseTo(A4.width, 0);
      expect(page.getHeight()).toBeCloseTo(A4.height, 0);
    }
  });

  it('assembles with a non-A4 PDF passport, normalizing it to a single A4 page', async () => {
    const passportPdf = await buildNonA4Pdf();
    const bytes = await assembleClaimPdf({
      claim,
      signaturePng: PNG_1X1,
      passport: { bytes: passportPdf, fileType: 'application/pdf' },
      now: new Date('2026-07-06T00:00:00Z'),
    });

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(7);
    expect(doc.getForm().getFields().length).toBe(0);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBeCloseTo(A4.width, 0);
      expect(page.getHeight()).toBeCloseTo(A4.height, 0);
    }
  });
});

describe('toPoaStreetAddress', () => {
  it('joins line1 and line2 with a comma when line2 is set', () => {
    expect(
      toPoaStreetAddress({
        currentAddressLine1: 'Mabini Street 12',
        currentAddressLine2: 'Apt. 4B',
      })
    ).toBe('Mabini Street 12, Apt. 4B');
  });

  it('returns line1 unchanged when line2 is null', () => {
    expect(
      toPoaStreetAddress({
        currentAddressLine1: 'Mabini Street 12',
        currentAddressLine2: null,
      })
    ).toBe('Mabini Street 12');
  });
});
