import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { MUSTER_2, MUSTER_2_A_DIRECT_EXPECTED } from './muster-2.fixture';
import {
  assembleBavPackage,
  PACKAGE_ORDER,
  planEnclosures,
  type BavLetterTemplateId,
  type EnclosureKind,
} from './package';
import { SIGNATURE_MARKER } from './render-letter';
import { TINY_PNG } from './test-fixtures';
import { getBavTemplate, loadBavTemplateSource } from './templates';

// Maps each line of a template's [[ANLAGEN]] block to the enclosure kind
// it names, so the assembler's order can be checked against the letter.
function anlagenKinds(templateId: BavLetterTemplateId): EnclosureKind[] {
  const src = loadBavTemplateSource(templateId);
  const block = /\[\[ANLAGEN\]\]([\s\S]*?)\[\[\/ANLAGEN\]\]/.exec(src);
  if (!block) throw new Error(`no ANLAGEN block in ${templateId}`);
  return block[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('Vollmacht (Original)')) return 'voll';
      if (line.includes('Erstattungsbescheid')) return 'drv_refund_decision';
      if (line.includes('Postempfangsvollmacht')) return 'pev';
      if (line.includes('Kopie Reisepass')) return 'passport';
      if (line.includes('Antragsformular')) return 'provider_form';
      if (line.includes('Zustimmungserklärung')) return 'employer_consent';
      if (line.includes('Beendigung des Arbeitsverhältnisses'))
        return 'employment_end_proof';
      if (
        line.includes('Standmitteilung') ||
        line.includes('{{statement_type}}')
      )
        return 'pension_statement';
      if (line.includes('Krankenversicherung'))
        return 'foreign_health_insurance';
      if (line.includes('Bankverbindung')) return 'bank_proof';
      throw new Error(`unmapped Anlagen line in ${templateId}: ${line}`);
    });
}

async function pdfWithPages(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i += 1) {
    doc.addPage([595.28, 841.89]).drawText(`page ${i + 1}`, { x: 50, y: 700 });
  }
  return doc.save();
}

describe('PACKAGE_ORDER', () => {
  it('matches the Anlagen order of every letter template', () => {
    for (const id of Object.keys(PACKAGE_ORDER) as BavLetterTemplateId[]) {
      expect(PACKAGE_ORDER[id], id).toEqual(anlagenKinds(id));
    }
  });
});

describe('planEnclosures', () => {
  it('keeps package order and drops absent optional enclosures', () => {
    expect(
      planEnclosures(
        'A-DIRECT',
        new Set<EnclosureKind>([
          'passport',
          'bank_proof',
          'pev',
          'drv_refund_decision',
        ])
      )
    ).toEqual(['drv_refund_decision', 'pev', 'passport', 'bank_proof']);
  });

  it('throws when a required enclosure is missing', () => {
    expect(() =>
      planEnclosures('B-DIRECT', new Set<EnclosureKind>(['passport', 'pev']))
    ).toThrow(/missing enclosures: pension_statement/);
    expect(() =>
      planEnclosures(
        'A-LAW',
        new Set<EnclosureKind>(['passport', 'drv_refund_decision'])
      )
    ).toThrow(/voll/);
  });
});

describe('assembleBavPackage', () => {
  it('assembles Muster 2 (A-DIRECT) in Anlagen order with the right page count', async () => {
    const letterText = MUSTER_2_A_DIRECT_EXPECTED.replace(
      '[Unterschrift]',
      SIGNATURE_MARKER
    );
    const pev = getBavTemplate('PEV').render({
      ...MUSTER_2,
      client_birthplace: 'Albany, USA',
      pev_start_date: '07.09.2026',
      client_signature: SIGNATURE_MARKER,
    }).text;

    const result = await assembleBavPackage({
      templateId: 'A-DIRECT',
      letterText,
      powerOfAttorneyText: pev,
      signaturePng: TINY_PNG,
      files: {
        drv_refund_decision: {
          bytes: await pdfWithPages(2),
          fileType: 'application/pdf',
        },
        passport: { bytes: TINY_PNG, fileType: 'image/png' },
        provider_form: {
          bytes: await pdfWithPages(1),
          fileType: 'application/pdf',
        },
        employer_consent: {
          bytes: await pdfWithPages(1),
          fileType: 'application/pdf',
        },
        foreign_health_insurance: { bytes: TINY_PNG, fileType: 'image/png' },
      },
    });

    expect(result.enclosures).toEqual([
      'drv_refund_decision',
      'pev',
      'passport',
      'provider_form',
      'employer_consent',
      'foreign_health_insurance',
    ]);
    const doc = await PDFDocument.load(result.bytes);
    // letter pages + Bescheid (2) + PEV (1–2) + passport (1) + form (1)
    // + consent (1) + insurance (1)
    const pevPages =
      doc.getPageCount() - result.letterPageCount - 2 - 1 - 1 - 1 - 1;
    expect(pevPages).toBeGreaterThanOrEqual(1);
    expect(pevPages).toBeLessThanOrEqual(2);
    for (let i = 0; i < doc.getPageCount(); i += 1) {
      const { width, height } = doc.getPage(i).getSize();
      expect(Math.round(width)).toBe(595);
      expect(Math.round(height)).toBe(842);
    }
  });

  it('rejects an unsupported enclosure file type', async () => {
    await expect(
      assembleBavPackage({
        templateId: 'B-DIRECT',
        letterText: 'Brief',
        powerOfAttorneyText: 'PEV',
        files: {
          pension_statement: {
            bytes: new Uint8Array([1]),
            fileType: 'image/webp',
          },
          passport: { bytes: TINY_PNG, fileType: 'image/png' },
        },
      })
    ).rejects.toThrow(/Unsupported file type/);
  });
});
