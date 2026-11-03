import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'fs';
import { crc32, deflateSync } from 'zlib';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  UnresolvedPlaceholderError,
  type DirectOp,
} from '../drv-pack/direct-layout';
import {
  buildProviderCoverLetterPlan,
  buildProviderPostalAuthorityPlan,
  RECIPIENT_WINDOW,
  type ProviderCoverLetterInput,
} from './letters';
import {
  PROVIDER_REFUND_PROVIDERS,
  providerProcedureDescription,
  providerRefundCodeOf,
  resolveStageBenefit,
} from './providers';
import {
  buildProviderRefundPack,
  directProviderCodeOf,
  providerRefundMapping,
  ProviderPackIncompleteError,
  type ProviderRefundClaim,
} from './pack';
import {
  fillStageForm,
  loadStageFormTemplate,
  membershipDigits,
  selectWidget,
} from './stage-form';

// Specimen data only. DE89… is the documented example IBAN.
//   pnpm exec vitest run --config vitest.pure.config.mts src/services/provider-refund
// Set PROVIDER_PACK_OUT=/some/dir to write the sample packs for a visual check.

/** Minimal RGBA PNG (signature stand-in). */
function png(w = 120, h = 40): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (Math.abs(y - x / 3) < 2) raw[y * (w * 4 + 1) + 1 + x * 4 + 3] = 255;
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ])
  );
}

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

async function fonts() {
  const doc = await PDFDocument.create();
  return {
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

const texts = (ops: DirectOp[]) =>
  ops.filter((o) => o.kind === 'text').map((o) => (o as { text: string }).text);

const agent = {
  name: 'Anna Kliem',
  lines: ['Kaskelstr. 46', '10317 Berlin'],
};

const stageClaim: ProviderRefundClaim = {
  pensionProvider: 'VddB',
  firstName: 'Mara',
  lastName: 'Specimen',
  dateOfBirth: '1988-04-12',
  currentAddressLine1: '12 Harbour Street',
  currentAddressLine2: null,
  currentCity: 'Dublin',
  currentPostalCode: 'D02 X285',
  currentCountry: 'Ireland',
  svNummer: 'J/B-123456',
  iban: 'DE89 3704 0044 0532 0130 00',
  swiftBic: 'COBADEFFXXX',
  accountHolderName: null,
  bankName: 'Example Bank',
  bankCity: 'Frankfurt am Main',
  stageDetails: {
    stageName: 'Staatstheater Musterstadt',
    rolePosition: 'Tänzerin',
    employmentEndDate: '2025-07-31',
    permanentlyStopped: 'yes',
    reasonForLeaving: 'relocation',
    currentOccupation: 'Yoga-Lehrerin',
    unableToWorkHealth: 'no',
  },
  providerRefundBenefit: null,
};

function coverInput(): ProviderCoverLetterInput {
  return {
    clientFullName: 'Mara Specimen',
    clientResidentialAddress: [
      '12 Harbour Street',
      'D02 X285 Dublin',
      'Irland',
    ],
    clientDateOfBirth: '12.04.1988',
    referenceLabel: 'Versicherungsnummer',
    referenceValue: '0123456789',
    provider: PROVIDER_REFUND_PROVIDERS.VBL,
    procedureDescription: providerProcedureDescription('VBL'),
    agentName: agent.name,
    agentPostalAddress: agent.lines,
    signaturePlace: 'Dublin',
    signatureDate: '30.10.2026',
    attachmentList: ['Antrag auf Beitragserstattung (L203)'],
  };
}

describe('provider codes', () => {
  it('maps the free-text provider to a code', () => {
    expect(providerRefundCodeOf('')).toBe('VBL');
    expect(providerRefundCodeOf('VBLklassik')).toBe('VBL');
    expect(providerRefundCodeOf('KVBW')).toBe('KVBW_ZVK');
    expect(providerRefundCodeOf('ZVK (KVBW)')).toBe('KVBW_ZVK');
    expect(providerRefundCodeOf('VddB')).toBe('VddB');
    expect(providerRefundCodeOf('VddKO')).toBe('VddKO');
    // A plain "ZVK" names no Kasse: stays manual.
    expect(providerRefundCodeOf('ZVK')).toBeNull();
    expect(directProviderCodeOf('VBL')).toBeNull();
    expect(directProviderCodeOf('KVBW')).toBe('KVBW_ZVK');
  });

  it('builds the procedure description per provider', () => {
    expect(providerProcedureDescription('VBL')).toBe(
      'mein Verfahren zur Beitragserstattung (VBL)'
    );
    expect(providerProcedureDescription('KVBW_ZVK')).toBe(
      'mein Verfahren zur Beitragserstattung (Kommunaler Versorgungsverband Baden-Württemberg)'
    );
    expect(providerProcedureDescription('VddKO', 'full_refund')).toBe(
      'mein Verfahren betreffend volle Beitragserstattung / Abfindung (Versorgungsanstalt der deutschen Kulturorchester)'
    );
  });

  it('derives the benefit unless admin set one', () => {
    expect(resolveStageBenefit(stageClaim)).toBe('partial_refund');
    expect(
      resolveStageBenefit({
        ...stageClaim,
        stageDetails: { unableToWorkHealth: 'yes' },
      })
    ).toBe('full_refund');
    expect(
      resolveStageBenefit({ ...stageClaim, providerRefundBenefit: 'return' })
    ).toBe('return');
    // VddKO has no full refund on its form.
    expect(
      resolveStageBenefit({
        ...stageClaim,
        pensionProvider: 'VddKO',
        stageDetails: { unableToWorkHealth: 'yes' },
      })
    ).toBe('partial_refund');
    expect(
      resolveStageBenefit({
        ...stageClaim,
        pensionProvider: 'VddKO',
        providerRefundBenefit: 'full_refund',
      })
    ).toBe('partial_refund');
  });

  it('reads the membership digits after the printed prefix', () => {
    expect(membershipDigits('J/B-123456')).toBe('123456');
    expect(membershipDigits('J/O–000123')).toBe('000123');
    expect(membershipDigits('123456')).toBe('123456');
    expect(membershipDigits('1234567')).toBeNull();
    expect(membershipDigits('')).toBeNull();
  });
});

describe('provider cover letter and Postempfangsvollmacht', () => {
  it('writes the template text with the provider and the agent', async () => {
    const { font, bold } = await fonts();
    const t = texts(buildProviderCoverLetterPlan(coverInput(), font, bold));
    const joined = t.join(' ');
    expect(t).toContain('VBL Versorgungsanstalt des Bundes und der Länder');
    expect(t).toContain('Kundenservice');
    expect(t).toContain('Deutschland');
    expect(t).toContain('Antrag auf Beitragserstattung');
    expect(t).toContain('Name: Mara Specimen, geb. 12.04.1988');
    expect(t).toContain('Versicherungsnummer: 0123456789');
    expect(t).toContain('Dublin, 30.10.2026');
    expect(joined).toContain('aus der VBLklassik');
    expect(joined).toContain('habe ich Anna Kliem mit der beigefügten');
    expect(joined).toContain('Bitte bestätigen Sie den Eingang');
    expect(t).toContain('1. Antrag auf Beitragserstattung (L203)');
    expect(joined).not.toMatch(/Vividius|Anderkonto|\{\{/);
  });

  it('keeps every recipient line inside the address window', async () => {
    const { font, bold } = await fonts();
    for (const p of Object.values(PROVIDER_REFUND_PROVIDERS)) {
      const ops = buildProviderCoverLetterPlan(
        { ...coverInput(), provider: p },
        font,
        bold
      );
      const lines = ops.filter(
        (o) =>
          o.kind === 'text' &&
          [...p.recipient, 'Deutschland'].includes(o.text) &&
          o.x === RECIPIENT_WINDOW.x
      ) as Extract<DirectOp, { kind: 'text' }>[];
      expect(lines).toHaveLength(p.recipient.length + 1);
      for (const l of lines) {
        expect(font.widthOfTextAtSize(l.text, l.size)).toBeLessThanOrEqual(
          RECIPIENT_WINDOW.maxWidth
        );
        expect(l.yTop).toBeGreaterThanOrEqual(RECIPIENT_WINDOW.top);
        expect(l.yTop + l.size).toBeLessThanOrEqual(RECIPIENT_WINDOW.bottom);
      }
    }
  });

  it('writes the general Postempfangsvollmacht for the procedure', async () => {
    const { font, bold } = await fonts();
    const input = {
      ...coverInput(),
      provider: PROVIDER_REFUND_PROVIDERS.VddB,
      procedureDescription: providerProcedureDescription(
        'VddB',
        'partial_refund'
      ),
    };
    const t = texts(buildProviderPostalAuthorityPlan(input, font, bold));
    const joined = t.join(' ');
    expect(t).toContain('Postempfangsvollmacht');
    expect(joined).toContain(
      'Für mein Verfahren betreffend anteilige Beitragserstattung / Abfindung (Versorgungsanstalt der deutschen Bühnen)'
    );
    expect(joined).toContain('Versicherungsnummer: 0123456789,');
    expect(joined).toContain('Geldempfangsvollmacht wird nicht erteilt');
    expect(t).toContain('Dublin, 30.10.2026');
  });

  it('refuses unresolved placeholders', async () => {
    const { font, bold } = await fonts();
    expect(() =>
      buildProviderPostalAuthorityPlan(
        { ...coverInput(), referenceValue: '' },
        font,
        bold
      )
    ).toThrow(UnresolvedPlaceholderError);
  });
});

describe('VddB / VddKO form', () => {
  it('offers the options the filler selects', async () => {
    for (const provider of ['VddB', 'VddKO'] as const) {
      const doc = await PDFDocument.load(loadStageFormTemplate(provider));
      const form = doc.getForm();
      expect(() =>
        selectWidget(form, 'Antragsgrund', 'Antrag auf Rückgewähr')
      ).not.toThrow();
      expect(() =>
        selectWidget(form, 'Antragsgrund', 'Antrag auf etwas anderes')
      ).toThrow(/No option/);
    }
  });

  it('fills and flattens both forms', async () => {
    for (const provider of ['VddB', 'VddKO'] as const) {
      const doc = await fillStageForm({
        provider,
        benefit: provider === 'VddB' ? 'full_refund' : 'immediate_return',
        lastName: 'Specimen',
        firstName: 'Mara',
        addressLine1: 'Musterstraße 5',
        addressLine2: null,
        postalCode: '10115',
        city: 'Berlin',
        dateOfBirth: '12.04.1988',
        membershipDigits: '123456',
        stageName: 'Staatstheater Musterstadt',
        role: 'Tänzerin',
        employmentEnd: '31.07.2025',
        permanentlyStopped: true,
        reasonForStopping: 'Umzug / Wegzug',
        currentOccupation: 'Lehrerin',
        unableToWork: false,
        bankName: 'Example Bank',
        bankCity: 'Frankfurt am Main',
        iban: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFFXXX',
        otherAccountHolder: null,
        signaturePlace: 'Berlin',
        signatureDate: '30.10.2026',
        signaturePng: png(),
      });
      expect(doc.getPageCount()).toBe(2);
      expect(doc.getForm().getFields()).toHaveLength(0);
    }
  });
});

describe('provider refund pack', () => {
  it('lists what the case is missing', () => {
    const m = providerRefundMapping({
      ...stageClaim,
      svNummer: null,
      bankName: null,
    });
    expect(m.code).toBe('VddB');
    expect(m.missing).toEqual(['Versicherungsnummer', 'bank name']);
    expect(
      providerRefundMapping({ ...stageClaim, pensionProvider: 'VBL' })
    ).toMatchObject({ code: null, missing: [] });
  });

  it('builds the VddB pack in the spec order', async () => {
    const { pdf, manifest } = await buildProviderRefundPack({
      claim: stageClaim,
      date: new Date('2026-10-30T10:00:00Z'),
      signaturePng: png(),
      signedAt: new Date('2026-10-29T10:00:00Z'),
      postalAgent: agent,
      passportPdf: await onePagePdf('Specimen passport'),
      providerFormPdf: null,
      extraDocuments: [
        {
          label: 'Angaben zur Steuer-Identifikationsnummer',
          pdf: await onePagePdf('Tax ID form'),
        },
      ],
    });
    expect(manifest.documents.map((d) => d.key)).toEqual([
      'cover',
      'application',
      'postal_authority',
      'id',
      'extra-1',
    ]);
    expect(manifest.anlagen).toEqual([
      'Antrag auf Beitragserstattung / Rückgewähr',
      'Postempfangsvollmacht für Anna Kliem',
      'Kopie des Reisepasses',
      'Angaben zur Steuer-Identifikationsnummer',
    ]);
    expect(manifest).toMatchObject({
      route: 'direct',
      kind: 'provider_refund',
      provider: 'VddB',
      benefit: 'partial_refund',
      signed: true,
      signatureDate: '29.10.2026',
      recipient: {
        carrierName: 'Versorgungsanstalt der deutschen Bühnen',
      },
    });
    expect(manifest.warnings.join(' ')).not.toContain(
      'Steuer-Identifikationsnummer'
    );
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(manifest.totalPages);
    if (process.env.PROVIDER_PACK_OUT)
      writeFileSync(`${process.env.PROVIDER_PACK_OUT}/vddb-pack.pdf`, pdf);
  });

  it('needs the uploaded form for KVBW', async () => {
    const claim = { ...stageClaim, pensionProvider: 'KVBW' };
    await expect(
      buildProviderRefundPack({
        claim,
        date: new Date('2026-10-30T10:00:00Z'),
        signaturePng: png(),
        signedAt: null,
        postalAgent: agent,
        passportPdf: null,
        providerFormPdf: null,
        extraDocuments: [],
      })
    ).rejects.toThrow(ProviderPackIncompleteError);

    const { manifest, pdf } = await buildProviderRefundPack({
      claim,
      date: new Date('2026-10-30T10:00:00Z'),
      signaturePng: png(),
      signedAt: null,
      postalAgent: agent,
      passportPdf: await onePagePdf('Specimen passport'),
      providerFormPdf: await onePagePdf('KVBW form, signed'),
      extraDocuments: [],
    });
    expect(manifest.provider).toBe('KVBW_ZVK');
    expect(manifest.anlagen[0]).toBe(
      'Antrag auf Erstattung der Beiträge bzw. der Arbeitnehmerbeteiligung'
    );
    if (process.env.PROVIDER_PACK_OUT)
      writeFileSync(`${process.env.PROVIDER_PACK_OUT}/kvbw-pack.pdf`, pdf);
  });
});
