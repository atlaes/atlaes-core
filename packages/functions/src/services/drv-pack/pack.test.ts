import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { sampleClient } from './fixtures';
import {
  buildSubmissionPack,
  recipientFromResolution,
  replyTypeFor,
} from './pack';
import { resolveCarrier } from './resolve-carrier';

async function onePagePdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  page.drawText(text, {
    x: 20,
    y: 150,
    size: 20,
    font: await doc.embedFont(StandardFonts.Helvetica),
  });
  return doc.save();
}

describe('replyTypeFor', () => {
  it('follows the owner rule', () => {
    expect(replyTypeFor('IN', 12)).toBe('rueckantwort'); // contracting state
    expect(replyTypeFor('CN', 72)).toBe('willenserklaerung'); // non-contracting, 60+
    expect(replyTypeFor('CN', 24)).toBe('none');
  });
});

describe('recipientFromResolution', () => {
  it('marks liaison offices as Verbindungsstelle', () => {
    const res = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: null,
      citizenship: 'AU',
      residence: 'AU',
    });
    const r = recipientFromResolution(res);
    expect(r.verbindungsstelleCountryDe).toBe('Australien');
    expect(r.mailingAddress.length).toBeGreaterThan(0);
  });

  it('throws when unresolved', () => {
    const res = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: null,
      citizenship: 'ZZ',
      residence: 'ZZ',
    });
    expect(() => recipientFromResolution(res)).toThrow(/unresolved/);
  });
});

describe('buildSubmissionPack', () => {
  it('merges the DRV refund pack in print order with a matching Anlagen list', async () => {
    const resolution = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: sampleClient.vsnr,
      citizenship: 'IN',
      residence: 'IN',
    });
    const pack = await buildSubmissionPack({
      aktenzeichen: '06152-26',
      date: new Date(2026, 8, 21),
      client: sampleClient,
      resolution,
      payslipPdf: await onePagePdf('payslip'),
      idCopyPdf: await onePagePdf('passport'),
    });
    const keys = pack.manifest.documents.map((d) => d.key);
    expect(keys).toEqual([
      'cover',
      'v0901',
      'a1310',
      'poa',
      'a1002',
      'reply',
      'payslip',
      'id',
    ]);
    expect(pack.manifest.anlagen).toEqual([
      'Zahlungserklärung (A1310)',
      'Lebensbescheinigung',
      'Rückantwort',
      'Kopie des Reisepasses',
      'eine auf uns lautende Vollmacht',
    ]);
    expect(pack.manifest.a1002Language).toBe('en');
    expect(pack.manifest.replyType).toBe('rueckantwort');
    const doc = await PDFDocument.load(pack.pdf);
    expect(doc.getPageCount()).toBe(pack.manifest.totalPages);
    expect(pack.manifest.totalPages).toBe(1 + 14 + 2 + 1 + 1 + 1 + 1 + 1);
    // Attached copies are normalised to A4
    const last = doc.getPage(doc.getPageCount() - 1).getSize();
    expect(Math.round(last.width)).toBe(595);
    expect(pack.manifest.warnings).toEqual([]);
  });

  it('drops the reply for a short non-contracting record and warns about a missing ID', async () => {
    const resolution = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '13 010185 M 007',
      citizenship: 'CN',
      residence: 'CN',
    });
    const pack = await buildSubmissionPack({
      aktenzeichen: '06153-26',
      date: new Date(),
      client: {
        ...sampleClient,
        citizenshipIso: 'CN',
        citizenshipLabel: 'chinesisch',
        residenceIso: 'CN',
        countryLabel: 'China',
        germanContributionMonths: 20,
      },
      resolution,
      includeLebensbescheinigung: false,
    });
    expect(pack.manifest.replyType).toBe('none');
    expect(pack.manifest.documents.map((d) => d.key)).toEqual([
      'cover',
      'v0901',
      'a1310',
      'poa',
    ]);
    expect(pack.manifest.anlagen).not.toContain('Rückantwort');
    expect(pack.manifest.anlagen).not.toContain('Lebensbescheinigung');
    expect(pack.manifest.warnings.some((w) => w.includes('ID copy'))).toBe(
      true
    );
  });

  it('uses the Willenserklärung and Spanish A1002 when the rules say so', async () => {
    const resolution = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '13 010185 M 007',
      citizenship: 'CN',
      residence: 'MX',
    });
    const pack = await buildSubmissionPack({
      aktenzeichen: '06154-26',
      date: new Date(),
      client: {
        ...sampleClient,
        citizenshipIso: 'CN',
        residenceIso: 'MX',
        countryLabel: 'Mexiko',
        germanContributionMonths: 61,
      },
      resolution,
      abmeldebestaetigungPdf: await onePagePdf('Abmeldung'),
      extraDocuments: [
        { label: 'Versicherungsverlauf', pdf: await onePagePdf('Verlauf') },
      ],
    });
    expect(pack.manifest.replyType).toBe('willenserklaerung');
    expect(pack.manifest.a1002Language).toBe('sp');
    expect(pack.manifest.anlagen).toEqual([
      'Zahlungserklärung (A1310)',
      'Lebensbescheinigung',
      'Abmeldebestätigung',
      'Rückantwort',
      'Kopie des Reisepasses',
      'eine auf uns lautende Vollmacht',
      'Versicherungsverlauf',
    ]);
    expect(pack.manifest.documents.map((d) => d.key)).toEqual([
      'cover',
      'v0901',
      'a1310',
      'poa',
      'a1002',
      'reply',
      'abmeldung',
      'extra-1',
    ]);
  });
});
