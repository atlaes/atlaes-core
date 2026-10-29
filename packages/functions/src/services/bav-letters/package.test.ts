import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildBavLetterPlan } from './context';
import { MUSTER_2_LETTER_CLAIM, MUSTER_2_OPTIONS } from './muster-2.fixture';
import { assembleBavPackage, planBavPack, type EnclosureFile } from './package';
import { SIGNATURE_MARKER } from './render-letter';
import { TINY_PNG } from './test-fixtures';
import { getBavTemplate } from './templates';

async function pdfWithPages(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i += 1) {
    doc.addPage([595.28, 841.89]).drawText(`page ${i + 1}`, { x: 50, y: 700 });
  }
  return doc.save();
}

const base = {
  status: 'vested' as const,
  drvDecisionDate: '02.07.2026',
  providerFormTitle: '',
  statementType: '',
  statementDate: '',
};

describe('planBavPack', () => {
  it('orders authority, DRV decision, passport, forms/evidence, then extras', () => {
    const { enclosures, missing } = planBavPack({
      ...base,
      authority: 'voll',
      documents: [
        { role: 'bav_extra', fileName: 'Erklaerung_1.pdf' },
        { role: 'pension_statement', fileName: 's.pdf' },
        { role: 'passport', fileName: 'p.jpg' },
        { role: 'provider_form', fileName: 'f.pdf' },
        { role: 'drv_refund_decision', fileName: 'b.pdf' },
        { role: 'bav_extra', fileName: 'zweite.png' },
      ],
    });
    expect(missing).toEqual([]);
    expect(enclosures.map((e) => [e.kind, e.documentIndex])).toEqual([
      ['voll', undefined],
      ['drv_refund_decision', 4],
      ['passport', 2],
      ['provider_form', 3],
      ['pension_statement', 1],
      ['bav_extra', 0],
      ['bav_extra', 5],
    ]);
    expect(enclosures.map((e) => e.label)).toEqual([
      'Vollmacht',
      'Erstattungsbescheid der Deutschen Rentenversicherung vom 02.07.2026',
      'Kopie des Reisepasses',
      'Antragsformular',
      'Standmitteilung',
      'Erklaerung 1',
      'zweite',
    ]);
  });

  it('requires the passport always and the DRV decision for vested only', () => {
    expect(
      planBavPack({ ...base, authority: 'pev', documents: [] }).missing
    ).toEqual([
      'Passport copy is required',
      'DRV refund decision (Erstattungsbescheid) is required for Vested letters',
    ]);
    const nonVested = planBavPack({
      ...base,
      status: 'non_vested',
      authority: 'pev',
      documents: [{ role: 'passport', fileName: 'p.jpg' }],
    });
    expect(nonVested.missing).toEqual([]);
    expect(nonVested.enclosures.map((e) => e.kind)).toEqual([
      'pev',
      'passport',
    ]);
  });
});

describe('assembleBavPackage', () => {
  it('merges the cover letter, the signed authority and the documents in plan order', async () => {
    const plan = buildBavLetterPlan(MUSTER_2_LETTER_CLAIM, {
      ...MUSTER_2_OPTIONS,
      signatureText: SIGNATURE_MARKER,
    });
    const letter = getBavTemplate(plan.templateId!).render(plan.context).text;
    const authority = getBavTemplate(plan.authority).render(plan.context).text;
    const files = new Map<number, EnclosureFile>([
      [0, { bytes: await pdfWithPages(2), fileType: 'application/pdf' }],
      [1, { bytes: TINY_PNG, fileType: 'image/png' }],
      [2, { bytes: await pdfWithPages(1), fileType: 'application/pdf' }],
      [3, { bytes: await pdfWithPages(3), fileType: 'application/pdf' }],
    ]);
    const result = await assembleBavPackage({
      letterText: letter,
      authorityText: authority,
      enclosures: plan.enclosures,
      files,
      signaturePng: TINY_PNG,
    });
    expect(result.enclosures).toEqual([
      'pev',
      'drv_refund_decision',
      'passport',
      'provider_form',
      'bav_extra',
    ]);
    const doc = await PDFDocument.load(result.bytes);
    // letter + PEV (1 page) + DRV (1) + passport (1) + form (2) + extra (3)
    expect(doc.getPageCount()).toBe(result.letterPageCount + 1 + 1 + 1 + 2 + 3);
  });

  it('refuses a signature slot without a signature', async () => {
    await expect(
      assembleBavPackage({
        letterText: `Brief\n${SIGNATURE_MARKER}`,
        authorityText: 'Postempfangsvollmacht',
        enclosures: [],
        files: new Map(),
      })
    ).rejects.toThrow(/signature/);
  });

  it('refuses when a planned document file is missing', async () => {
    await expect(
      assembleBavPackage({
        letterText: 'Brief',
        authorityText: 'Postempfangsvollmacht',
        enclosures: [
          {
            kind: 'passport',
            label: 'Kopie des Reisepasses',
            documentIndex: 0,
          },
        ],
        files: new Map(),
      })
    ).rejects.toThrow(/file for passport is missing/);
  });
});
