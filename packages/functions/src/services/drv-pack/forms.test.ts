import { describe, expect, it } from 'vitest';
import { inflateSync } from 'zlib';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
} from 'pdf-lib';
import { loadGprAsset } from './assets';
import { buttonOnValues, selectButton } from './acroform';
import { a1002LanguageForResidence, buildA1002 } from './a1002-form';
import { fillA1310, fillA1310Fields } from './a1310-form';
import { fillV0901, fillV0901Fields, type V0901Data } from './v0901-form';
import {
  applyV0901Answers,
  sanitizeV0901Overrides,
  V0901_QUESTIONS,
} from './v0901-answers';
import {
  appendRueckantwort,
  renderPoa,
  renderWillenserklaerung,
} from './simple-docs';

const v0901Data: V0901Data = {
  vsnr: '65 120390 S 512',
  lastName: 'Sharma',
  firstName: 'Priya',
  dateOfBirth: '1990-03-12',
  sex: 'female',
  citizenship: 'indisch',
  placeOfBirth: 'Pune, Maharashtra',
  street: '14 MG Road',
  postalCodeCity: '411001 Pune',
  country: 'Indien',
  phone: '+91 98 7654 3210',
  dateLeftGermany: '2024-06-30',
  lastGermanAddress: 'Musterstraße 1, 10115 Berlin',
  aktenzeichen: '06152-26',
  date: new Date(2026, 8, 21),
};

function selected(doc: PDFDocument, field: string): string | undefined {
  const v = doc
    .getForm()
    .getCheckBox(field)
    .acroField.dict.get(PDFName.of('V'));
  return v ? (v as PDFName).decodeText() : undefined;
}

describe('acroform helpers', () => {
  it('exposes the multi-widget on-values of the V0901', async () => {
    const doc = await PDFDocument.load(loadGprAsset('v0901'));
    const form = doc.getForm();
    expect(buttonOnValues(form, 'AW_ANTRAGSART_1')).toContain(
      'Erstattung an Versicherte'
    );
    expect(buttonOnValues(form, 'Q_PAF_Vers_Geschlecht')).toEqual(
      expect.arrayContaining(['Männlich', 'Weiblich'])
    );
    expect(() => selectButton(form, 'AW_VV_1', 'vielleicht')).toThrow(
      /available: /
    );
  });
});

describe('V0901', () => {
  it('fills the annotated field set', async () => {
    const doc = await PDFDocument.load(loadGprAsset('v0901'));
    fillV0901Fields(doc, v0901Data);
    const form = doc.getForm();
    expect(form.getTextField('PAF_VSNR_trim').getText()).toBe('65120390S512');
    expect(form.getTextField('Q_PAF_Vers_GebDat_trim').getText()).toBe(
      '12031990'
    );
    // Section 4 per the owner's screenshot (13 Oct 2026): lawyer, firm,
    // then the firm's Aktenzeichen.
    expect(form.getTextField('VERT_N_VN_D_1').getText()).toBe(
      'Chudoba, Katja, Rechtsanwältin\nVividius Rechtsanwälte\nAz. 06152-26'
    );
    expect(form.getTextField('IBAN_1').getText()).toBe('46100500000670012467'); // after pre-printed DE
    expect(form.getTextField('VERS_O_DAT_1').getText()).toBe(
      'Berlin, 21.09.2026'
    );
    expect(selected(doc, 'AW_ANTRAGSART_1')).toBe('Erstattung an Versicherte');
    expect(selected(doc, 'Q_PAF_Vers_Geschlecht')).toBe('Weiblich');
    expect(selected(doc, 'AW_VV_1')).toBe('ja');
    expect(selected(doc, 'AW_BEITR_AUSL_VT')).toBe('nein');
    expect(selected(doc, 'AW_EIGENSCHAFT_1')).toBe('Bevollmächtigter');
  });

  it('honours default overrides', async () => {
    const doc = await PDFDocument.load(loadGprAsset('v0901'));
    fillV0901Fields(doc, {
      ...v0901Data,
      defaults: {
        foreignContributions: true,
        representativeCapacity: 'Bevollmächtigter',
      },
    });
    expect(selected(doc, 'AW_BEITR_AUSL_VT')).toBe('ja');
    expect(selected(doc, 'AW_EIGENSCHAFT_1')).toBe('Bevollmächtigter');
  });

  it('fills the ops overrides for 5.1 / 6.1 / 6.3 / 8.1', async () => {
    const overrides = applyV0901Answers(null, {
      insuranceRecordIssued: false,
      insuranceRecordCorrect: false,
      foreignContributions: true,
      currentlyInsuredAbroad: true,
      germanBenefitsReceived: true,
    });
    const doc = await PDFDocument.load(loadGprAsset('v0901'));
    fillV0901Fields(doc, {
      ...v0901Data,
      defaults: sanitizeV0901Overrides(overrides),
    });
    expect(selected(doc, 'AW_VV_1')?.trim()).toBe('nein');
    expect(selected(doc, 'AW_VV_2')?.trim()).toBe('nein');
    expect(selected(doc, 'AW_BEITR_AUSL_VT')).toBe('ja');
    expect(selected(doc, 'AW_AUSLAND_VP_1')).toBe('ja');
    expect(selected(doc, 'AW_SACH_GELD')).toBe('ja');
    // Questions ops cannot edit keep their annotated answers.
    expect(selected(doc, 'AW_AUFENTHALT_AUSL')).toBe('nein');
  });

  it('every editable question maps to a ja/nein button on the form', async () => {
    const doc = await PDFDocument.load(loadGprAsset('v0901'));
    const form = doc.getForm();
    for (const q of V0901_QUESTIONS) {
      expect(
        buttonOnValues(form, q.field)
          .map((v) => v.trim())
          .sort()
      ).toEqual(['ja', 'nein']);
    }
  });

  it('renders a flattened 14-page document', async () => {
    const doc = await fillV0901(v0901Data);
    expect(doc.getPageCount()).toBe(14);
    expect(doc.getForm().getFields()).toHaveLength(0);
  });

  it('leaves the signature line empty for the lawyer to sign by hand', async () => {
    const template = await PDFDocument.load(loadGprAsset('v0901'));
    const doc = await fillV0901(v0901Data);
    // Only the template's own artwork, no signature image on top.
    expect(imageXObjectCount(doc, 13)).toBe(imageXObjectCount(template, 13));
  });
});

describe('A1310', () => {
  const data = {
    vsnr: '65120390S512',
    lastName: 'Sharma',
    firstName: 'Priya',
    street: '14 MG Road',
    postalCodeCityCountry: '411001 Pune, Indien',
    date: new Date(2026, 8, 21),
  };

  it('fills escrow account, not-holder box and both dates', async () => {
    const doc = await PDFDocument.load(loadGprAsset('a1310'));
    fillA1310Fields(doc, data);
    const form = doc.getForm();
    expect(form.getTextField('X_IBAN_1').getText()).toBe(
      'DE46 1005 0000 0670 0124 67'
    );
    expect(selected(doc, 'X_AW_KONTO')).toBe('nicht innehabende Person');
    expect(form.getCheckBox('AW_EURO').isChecked()).toBe(true);
    expect(form.getTextField('X_DAT_1').getText()).toBe('21.09.2026');
    expect(form.getTextField('X_DAT_4').getText()).toBe('21.09.2026');
  });

  it('dates the client signature on the day the client signed online', async () => {
    const doc = await PDFDocument.load(loadGprAsset('a1310'));
    fillA1310Fields(doc, { ...data, clientDate: new Date(2026, 8, 3) });
    const form = doc.getForm();
    expect(form.getTextField('X_DAT_1').getText()).toBe('03.09.2026');
    expect(form.getTextField('X_DAT_4').getText()).toBe('21.09.2026');
  });

  it('renders two flattened pages', async () => {
    const doc = await fillA1310(data);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getForm().getFields()).toHaveLength(0);
  });
});

describe('A1002', () => {
  it('picks the language by residence', () => {
    expect(a1002LanguageForResidence('IN')).toBe('en');
    expect(a1002LanguageForResidence('mx')).toBe('sp');
    expect(a1002LanguageForResidence('AR')).toBe('sp');
    expect(a1002LanguageForResidence('BR')).toBe('pg');
    expect(a1002LanguageForResidence('MZ')).toBe('pg');
  });

  const data = {
    vsnr: '65 120390 S 512',
    lastName: 'Sharma',
    firstName: 'Priya',
    dateOfBirth: '1990-03-12',
    address: '14 MG Road, 411001 Pune',
    country: 'Indien',
  };

  it('fills the Spanish AcroForm and flattens it', async () => {
    const r = await buildA1002({ ...data, language: 'sp' });
    expect(r.manualFill).toBe(false);
    expect(r.doc.getPageCount()).toBe(1);
    expect(r.doc.getForm().getFields()).toHaveLength(0);
  });

  it('overlays the English flat form', async () => {
    const r = await buildA1002({ ...data, language: 'en' });
    expect(r.manualFill).toBe(false);
    expect(r.doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('flags the Portuguese scan for manual fill', async () => {
    const r = await buildA1002({ ...data, language: 'pg' });
    expect(r.manualFill).toBe(true);
  });
});

describe('generated single pages', () => {
  const date = new Date(2026, 8, 21);

  it('PoA renders one page', async () => {
    const doc = await PDFDocument.create();
    await renderPoa(doc, {
      firstName: 'Priya',
      lastName: 'Sharma',
      dateOfBirth: '1990-03-12',
      passportNumber: 'Z1234567',
      placeOfResidence: 'Pune, Indien',
      date,
    });
    expect(doc.getPageCount()).toBe(1);
    const text = await pageText(doc, 0);
    // Place of residence and signing date on one line (owner, 13 Oct 2026).
    expect(text).toContain('Pune, Indien, 21.09.2026');
    expect(text).toContain('Zahlungserklärung A1310');
    expect(text).not.toContain('A1313');
  });

  it('Willenserklärung renders one page', async () => {
    const doc = await PDFDocument.create();
    await renderWillenserklaerung(doc, {
      vsnr: '65120390S512',
      city: 'Pune',
      date,
    });
    expect(doc.getPageCount()).toBe(1);
  });

  it('Rückantwort appends the template page with overlay', async () => {
    const doc = await PDFDocument.create();
    await appendRueckantwort(doc, { vsnr: '65120390S512', city: 'Pune', date });
    expect(doc.getPageCount()).toBe(1);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(612);
  });
});

/** Image XObjects drawn directly on a page (a stamped signature is one). */
function imageXObjectCount(doc: PDFDocument, pageIndex: number): number {
  const resources = doc.getPage(pageIndex).node.Resources();
  const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!xobjects) return 0;
  return xobjects
    .entries()
    .map(([, ref]) => doc.context.lookup(ref as PDFRef))
    .filter(
      (obj) =>
        obj instanceof PDFRawStream &&
        obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')
    ).length;
}

/** Text shown by a generated page (pdf-lib writes WinAnsi hex strings). */
async function pageText(
  original: PDFDocument,
  pageIndex: number
): Promise<string> {
  // Saving turns the in-memory content streams into raw (encoded) ones.
  const doc = await PDFDocument.load(await original.save());
  const contents = doc.getPage(pageIndex).node.Contents();
  const streams: unknown[] =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => doc.context.lookup(ref))
      : [contents];
  const decoded = streams
    .filter((st): st is PDFRawStream => st instanceof PDFRawStream)
    .map((st: PDFRawStream) => {
      const filter = st.dict.get(PDFName.of('Filter'));
      return filter === PDFName.of('FlateDecode')
        ? inflateSync(Buffer.from(st.contents)).toString('latin1')
        : Buffer.from(st.contents).toString('latin1');
    })
    .join('\n');
  return [...decoded.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)]
    .map((m) => Buffer.from(m[1], 'hex').toString('latin1'))
    .join('\n');
}
