import { describe, expect, it } from 'vitest';
import { crc32, deflateSync } from 'zlib';
import { PDFDocument, PDFName, StandardFonts } from 'pdf-lib';
import { loadGprAsset } from './assets';
import { sampleClient } from './fixtures';
import { resolveCarrier } from './resolve-carrier';
import { recipientFromResolution } from './pack';
import {
  buildDirectCoverLetterPlan,
  type DirectCoverLetterInput,
} from './direct-cover-letter';
import {
  buildPostalAuthorityPlan,
  procedureDescription,
} from './postal-authority';
import { UnresolvedPlaceholderError, type DirectOp } from './direct-layout';
import {
  buildDirectSubmissionPack,
  DirectPackIncompleteError,
  directDocFields,
} from './direct-pack';
import { isValidIban, mapV0901Bank } from './v0901-bank';
import {
  fillV0901Fields,
  V0901_SECTION4_TEXT_FIELDS,
  type V0901Data,
} from './v0901-form';
import { VIVIDIUS } from './cover-letter';
import { isDirectDrvRefund, submissionRouteOf, submittedToDrv } from './route';

// Specimen data only. DE89… is the documented example IBAN.
const DE_IBAN = 'DE89 3704 0044 0532 0130 00';
const FR_IBAN = 'FR14 2004 1010 0505 0001 3M02 606';

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

const resolution = resolveCarrier({
  lastOffice: 'UNKNOWN',
  vsnr: sampleClient.vsnr,
  citizenship: 'IN',
  residence: 'IN',
});
const agent = {
  salutation: 'Frau' as const,
  name: 'Anna Kliem',
  coLine: null,
  street: 'Kaskelstr. 46',
  postalCode: '10317',
  city: 'Berlin',
};

describe('submission route', () => {
  it('defaults DRV refunds to Vividius and recognises direct', () => {
    expect(submissionRouteOf({ caseType: 'drv_refund' })).toBe('law_firm');
    expect(
      isDirectDrvRefund({ caseType: 'drv_refund', handlingRoute: 'direct' })
    ).toBe(true);
    expect(
      isDirectDrvRefund({ caseType: 'vbl_refund', handlingRoute: 'direct' })
    ).toBe(false);
    expect(isDirectDrvRefund({ caseType: 'drv_refund' })).toBe(false);
    expect(submittedToDrv({ submissionDispatchedAt: new Date() })).toBe(true);
    expect(submittedToDrv({ lawFirmSubmittedAt: null })).toBe(false);
  });
});

describe('V0901 section 11 mapping (client account)', () => {
  it('validates IBAN checksums', () => {
    expect(isValidIban(DE_IBAN)).toBe(true);
    expect(isValidIban('DE89370400440532013001')).toBe(false);
  });

  it('puts a German IBAN into 11.1 without the pre-printed DE', () => {
    const m = mapV0901Bank({
      iban: DE_IBAN,
      bankName: 'Commerzbank',
      bankCity: 'Köln',
    });
    expect(m.branch).toBe('germany');
    expect(m.missing).toEqual([]);
    expect(m.fields.IBAN_1).toBe('89370400440532013000');
    expect(m.fields.BANK_1).toBe('Commerzbank, Köln');
    expect(m.fields.IBAN_2).toBe('');
    expect(m.fields.KONTO_N_VN_1).toBe('');
    expect(m.fields.KONTO_ANSCHRIFT_1).toBe('');
  });

  it('puts another SEPA IBAN into 11.2 with BIC', () => {
    const m = mapV0901Bank({
      iban: FR_IBAN,
      swiftBic: 'bnpafrpp',
      bankName: 'Banque Exemple',
      bankCity: 'Paris',
    });
    expect(m.branch).toBe('sepa');
    expect(m.fields.IBAN_2).toBe('FR1420041010050500013M02606');
    expect(m.fields.BIC_2).toBe('BNPAFRPP');
    expect(m.fields.BANK_2).toBe('Banque Exemple, Paris');
    expect(m.fields.IBAN_1).toBe('');
  });

  it('puts a non-European account into 11.3 as free text', () => {
    const m = mapV0901Bank(
      {
        accountNumber: '000123456',
        bsb: '062-000',
        swiftBic: 'CTBAAU2S',
        bankName: 'Example Bank',
        bankStreet: '1 Sample St',
        bankCity: 'Sydney',
        bankPostalCode: '2000',
        bankCountry: 'Australia',
        accountHolderName: 'Priya Sharma',
      },
      'Priya Sharma'
    );
    expect(m.branch).toBe('outside_europe');
    expect(m.missing).toEqual([]);
    expect(m.warnings).toEqual([]);
    expect(m.fields.BANK_AUSLAND_1).toBe(
      'Example Bank\n1 Sample St\n2000 Sydney\nAustralien'
    );
    expect(m.fields.BANK_AUSLAND_2).toBe('000123456');
    expect(m.fields.BANK_AUSLAND_3).toBe('SWIFT/BIC CTBAAU2S · BSB 062-000');
  });

  it('reports missing bank data and never falls back to escrow', () => {
    const m = mapV0901Bank({});
    expect(m.branch).toBeNull();
    expect(m.missing.length).toBeGreaterThan(0);
    expect(Object.values(m.fields).every((v) => v === '')).toBe(true);
    expect(
      mapV0901Bank({ bankCountry: 'France', bankName: 'X' }).missing
    ).toEqual(['IBAN for the European bank account']);
    expect(
      mapV0901Bank({ accountNumber: '1', bankName: 'X', bankCountry: 'US' })
        .missing
    ).toEqual(['SWIFT/BIC of the bank']);
  });

  it('warns when the account holder is a third party', () => {
    const m = mapV0901Bank(
      { iban: DE_IBAN, bankName: 'B', accountHolderName: 'Somebody Else' },
      'Priya Sharma'
    );
    expect(m.warnings[0]).toMatch(/differs from the client/);
  });
});

describe('V0901 direct mapping', () => {
  const data: V0901Data = {
    vsnr: sampleClient.vsnr,
    lastName: 'Sharma',
    firstName: 'Priya',
    dateOfBirth: '1990-03-12',
    sex: 'female',
    citizenship: 'indisch',
    placeOfBirth: 'Pune',
    street: '14 MG Road',
    postalCodeCity: '411001 Pune',
    country: 'Indien',
    dateLeftGermany: '2024-06-30',
    lastGermanAddress: 'Musterstraße 1, 10115 Berlin',
    aktenzeichen: '',
    date: new Date(2026, 9, 29),
    route: 'direct',
    bank: mapV0901Bank({ iban: DE_IBAN, bankName: 'Commerzbank' }).fields,
    signaturePlace: 'Pune',
    signatureDate: new Date(2026, 9, 27),
  };

  it('clears section 4 and 11.4, fills 11.1 and the client place/date', async () => {
    const doc = await PDFDocument.load(loadGprAsset('v0901'));
    fillV0901Fields(doc, data);
    const form = doc.getForm();
    for (const f of V0901_SECTION4_TEXT_FIELDS)
      expect(form.getTextField(f).getText() ?? '').toBe('');
    const cap = form.getCheckBox('AW_EIGENSCHAFT_1').acroField;
    expect((cap.dict.get(PDFName.of('V')) as PDFName).decodeText()).toBe('Off');
    for (const w of cap.getWidgets())
      expect(w.getAppearanceState()?.decodeText()).toBe('Off');
    expect(form.getTextField('IBAN_1').getText()).toBe('89370400440532013000');
    expect(form.getTextField('BANK_1').getText()).toBe('Commerzbank');
    expect(form.getTextField('KONTO_N_VN_1').getText() ?? '').toBe('');
    expect(form.getTextField('KONTO_ANSCHRIFT_1').getText() ?? '').toBe('');
    expect(form.getTextField('VERS_O_DAT_1').getText()).toBe(
      'Pune, 27.10.2026'
    );
    const all = form
      .getFields()
      .filter((f) => f.constructor.name === 'PDFTextField')
      .map((f) => form.getTextField(f.getName()).getText() ?? '')
      .join('|');
    expect(all).not.toContain('Vividius');
    expect(all).not.toContain(VIVIDIUS.escrowIbanCompact.slice(2));
    expect(all).not.toContain('Berlin,');
  });

  it('refuses to fill the direct V0901 without bank data', async () => {
    const doc = await PDFDocument.load(loadGprAsset('v0901'));
    expect(() => fillV0901Fields(doc, { ...data, bank: undefined })).toThrow(
      /bank/
    );
  });
});

describe('direct cover letter and Postempfangsvollmacht', () => {
  const recipient = recipientFromResolution(resolution);
  const fields = directDocFields(
    sampleClient,
    recipient,
    agent,
    new Date(2026, 9, 27)
  );
  const input: DirectCoverLetterInput = {
    ...fields,
    attachmentList: [
      'Antrag auf Beitragserstattung (V0901)',
      'Postempfangsvollmacht für Anna Kliem',
    ],
  };

  it('fills every placeholder from the case', () => {
    expect(fields.clientFullName).toBe('Priya Sharma');
    expect(fields.clientResidentialAddress).toEqual([
      '14 MG Road',
      '411001 Pune',
      'Indien',
    ]);
    expect(fields.clientDateOfBirth).toBe('12.03.1990');
    expect(fields.clientVsnr).toBe('65 120390 S 512');
    expect(fields.agentPostalAddress).toEqual([
      'Kaskelstr. 46',
      '10317 Berlin',
    ]);
    expect(fields.signaturePlace).toBe('Pune');
    expect(fields.signatureDate).toBe('27.10.2026');
  });

  it('writes the client letter without firm, AZ or escrow wording', async () => {
    const { font, bold } = await fonts();
    const t = texts(buildDirectCoverLetterPlan(input, font, bold));
    const joined = t.join(' ');
    expect(t).toContain(
      'Antrag auf Erstattung von Rentenversicherungsbeiträgen'
    );
    expect(t).toContain('Versicherungsnummer: 65 120390 S 512');
    expect(t).toContain('Geburtsdatum: 12.03.1990');
    expect(t).toContain('Pune, 27.10.2026');
    expect(t).toContain('Kaskelstr. 46');
    expect(t).toContain('Unterschrift der antragstellenden Person');
    expect(t).toContain('Anlagen');
    expect(joined).toContain('Ich stelle den Antrag selbst.');
    expect(joined).toContain('Frau Anna Kliem');
    expect(joined).toContain(recipient.carrierName);
    for (const banned of [
      'Vividius',
      'Unser Zeichen',
      'Anderkonto',
      'Chudoba',
      'Rechtsanw',
      '{{',
    ])
      expect(joined).not.toContain(banned);
  });

  it('takes the salutation from the postal-agent setting', async () => {
    const { font, bold } = await fonts();
    const plan = (agentSalutation: string) =>
      texts(
        buildDirectCoverLetterPlan(
          { ...input, agentSalutation, agentName: 'Max Muster' },
          font,
          bold
        )
      ).join(' ');
    expect(plan('Herr')).toContain('habe ich Herrn Max Muster mit');
    expect(plan('')).toContain('habe ich Max Muster mit');
  });

  it('refuses unresolved placeholders', async () => {
    const { font, bold } = await fonts();
    expect(() =>
      buildDirectCoverLetterPlan(
        { ...input, clientVsnr: '', attachmentList: [] },
        font,
        bold
      )
    ).toThrow(UnresolvedPlaceholderError);
    expect(() =>
      buildPostalAuthorityPlan(
        { ...fields, signaturePlace: '{{signature_place}}' },
        font,
        bold
      )
    ).toThrow(/signature_place/);
  });

  it('keeps the signature block together when the letter overflows', async () => {
    const { font, bold } = await fonts();
    const long = {
      ...input,
      clientResidentialAddress: Array.from(
        { length: 12 },
        (_, i) => `Zeile ${i}`
      ),
      attachmentList: Array.from({ length: 30 }, (_, i) => `Anlage ${i}`),
    };
    const ops = buildDirectCoverLetterPlan(long, font, bold);
    const sig = ops.find((o) => o.kind === 'signature')!;
    const caption = ops.find(
      (o) =>
        o.kind === 'text' &&
        o.text === 'Unterschrift der antragstellenden Person'
    )!;
    expect(caption.page).toBe(sig.page);
    expect(Math.max(...ops.map((o) => o.page))).toBeGreaterThan(0);
    for (const o of ops) if ('yTop' in o) expect(o.yTop).toBeLessThan(800);
  });

  it('limits the postal authority to post receipt for the named office', async () => {
    const { font, bold } = await fonts();
    const joined = texts(buildPostalAuthorityPlan(fields, font, bold)).join(
      ' '
    );
    expect(joined).toContain('Postempfangsvollmacht');
    expect(joined).toContain(
      `Für ${procedureDescription(recipient.carrierName)}`
    );
    expect(joined).toContain('Ich, Priya Sharma, geboren am 12.03.1990,');
    expect(joined).toContain('wohnhaft 14 MG Road');
    expect(joined).toContain('Indien,');
    expect(joined).toContain('Versicherungsnummer 65 120390 S 512,');
    expect(joined).toContain('Geldempfangsvollmacht wird nicht erteilt.');
    expect(joined).toContain('Pune, 27.10.2026');
    expect(joined).not.toContain('Vividius');
  });

  it('declines the DRV office name for the procedure line', () => {
    expect(procedureDescription('Deutsche Rentenversicherung Bund')).toBe(
      'mein Beitragserstattungsverfahren bei der Deutschen Rentenversicherung Bund'
    );
  });
});

describe('buildDirectSubmissionPack', () => {
  const client = {
    ...sampleClient,
    signaturePng: png(),
    signedAt: new Date(2026, 9, 27),
  };

  it('merges the direct pack in print order without A1310 or PoA', async () => {
    const pack = await buildDirectSubmissionPack({
      date: new Date(2026, 9, 29),
      client,
      bank: { iban: DE_IBAN, bankName: 'Commerzbank', bankCity: 'Köln' },
      resolution,
      postalAgent: agent,
      payslipPdf: await onePagePdf('payslip'),
      idCopyPdf: await onePagePdf('passport'),
    });
    const keys = pack.manifest.documents.map((d) => d.key);
    expect(keys).toEqual([
      'cover',
      'v0901',
      'postal_authority',
      'a1002',
      'reply',
      'payslip',
      'id',
    ]);
    expect(pack.manifest.route).toBe('direct');
    expect(pack.manifest.aktenzeichen).toBeNull();
    expect(pack.manifest.signed).toBe(true);
    expect(pack.manifest.bankBranch).toBe('germany');
    expect(pack.manifest.anlagen).toEqual([
      'Antrag auf Beitragserstattung (V0901)',
      'Postempfangsvollmacht für Anna Kliem',
      'Lebensbescheinigung (A1002)',
      'Rückantwort zur Beitragserstattung',
      'Kopie der Gehaltsabrechnung',
      'Kopie des Reisepasses',
    ]);
    const merged = await PDFDocument.load(pack.pdf);
    expect(merged.getPageCount()).toBe(pack.manifest.totalPages);
    expect(pack.manifest.documents.reduce((s, d) => s + d.pages, 0)).toBe(
      pack.manifest.totalPages
    );
  });

  it('cannot be built without the client bank account', async () => {
    await expect(
      buildDirectSubmissionPack({
        date: new Date(2026, 9, 29),
        client,
        bank: {},
        resolution,
        postalAgent: agent,
      })
    ).rejects.toBeInstanceOf(DirectPackIncompleteError);
  });

  it('marks an unsigned pack', async () => {
    const pack = await buildDirectSubmissionPack({
      date: new Date(2026, 9, 29),
      client: sampleClient,
      bank: { iban: DE_IBAN, bankName: 'Commerzbank' },
      resolution,
      postalAgent: agent,
    });
    expect(pack.manifest.signed).toBe(false);
    expect(pack.manifest.warnings.join(' ')).toMatch(/signature/);
  });
});
