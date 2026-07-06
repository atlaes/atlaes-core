import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadL203Template } from './assets';
import { fillL203, fillL203Fields, selectButtonExport } from './l203-form';

const PNG_1X1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
);

const data = {
  vblReference: 'AB12334567',
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  dateOfBirth: '1990-03-05',
  placeOfBirth: 'Manila',
  addressLine1: 'Mabini Street 12',
  postalCode: '1000',
  city: 'Manila',
  country: 'Philippines',
  iban: 'DE89370400440532013000',
  swiftBic: 'COBADEFFXXX',
  accountHolderName: null,
  bankName: 'Commerzbank',
  bankCity: 'Berlin',
  ortDatum: 'Manila, 06.07.2026',
  signaturePng: PNG_1X1,
};

describe('L203 form filling', () => {
  it('fills all mapped fields (pre-flatten)', async () => {
    const doc = await PDFDocument.load(loadL203Template());
    fillL203Fields(doc, data);
    const form = doc.getForm();
    const get = (n: string) =>
      form.getTextField(`topmostSubform[0].Page1[0].${n}[0]`).getText();
    expect(get('versicherungsnummer')).toBe('AB12334567');
    expect(get('Name')).toBe('Dela Cruz');
    expect(get('Vorname')).toBe('Juan');
    expect(get('geburtsdatum')).toBe('05031990');
    expect(get('Geburtsort')).toBe('Manila');
    expect(get('Straße')).toBe('Mabini Street'); // house number split off
    expect(get('Hausnr')).toBe('12');
    expect(get('PLZ')).toBe('1000');
    expect(get('Wohnort')).toBe('Manila');
    expect(get('Länderkennz')).toBe('PHL');
    expect(get('IBAN')).toBe('DE89370400440532013000');
    expect(get('BIC')).toBe('COBADEFFXXX');
    expect(get('geldinstitut')).toBe('Commerzbank, Berlin');
    expect(
      form.getTextField('topmostSubform[0].Page2[0].ort_datum[0]').getText()
    ).toBe('Manila, 06.07.2026');
    expect(
      form.getTextField('topmostSubform[0].Page2[0].Anlagen[0]').getText()
    ).toBe('Kopie Ausweisdokument, Postempfangsvollmacht');

    // NOTE: deviation from the task brief. The brief's test snippet called
    // `form.getRadioGroup(...).getSelected()`, but Step 0 (see l203-form.ts
    // header comment) established that these Optionsfeld groups are typed
    // as /Btn fields *without* the Radio flag (Ff bit 16) set, so pdf-lib
    // constructs them as PDFCheckBox, not PDFRadioGroup --
    // `form.getRadioGroup(...)` throws UnexpectedFieldTypeError on this
    // template. We assert via the underlying AcroField value instead,
    // which is the mechanism `fillL203Fields` actually uses to select an
    // option (see l203-form.ts for why `.check()`/`.select()` can't be
    // used directly either).
    const getButtonValue = (n: string) =>
      form
        .getCheckBox(`topmostSubform[0].Page2[0].${n}[0]`)
        .acroField.getValue()
        .toString();
    expect(getButtonValue('Optionsfeld2')).toBe('/nein');
    // Highest-risk value: adjudicated against the task brief's wrong
    // presumption (see Step-0 finding 3 in l203-form.ts) -- /liegtbei
    // sits in the "ja" column and /wirdnachgereicht in the "nein"
    // column for this field, unlike every other Optionsfeld.
    expect(getButtonValue('Optionsfeld3')).toBe('/wirdnachgereicht');
    expect(getButtonValue('Optionsfeld4')).toBe('/nein');
    expect(getButtonValue('Optionsfeld5')).toBe('/2');
  });

  it('throws a descriptive error for a bogus export value', async () => {
    const doc = await PDFDocument.load(loadL203Template());
    fillL203Fields(doc, data);
    const form = doc.getForm();
    expect(() =>
      selectButtonExport(
        form,
        'topmostSubform[0].Page2[0].Optionsfeld3[0]',
        'liegtbei-typo'
      )
    ).toThrowError(/Optionsfeld3.*liegtbei-typo|liegtbei-typo.*Optionsfeld3/s);
    expect(() =>
      selectButtonExport(
        form,
        'topmostSubform[0].Page2[0].Optionsfeld3[0]',
        'liegtbei-typo'
      )
    ).toThrowError(/available on-values/i);
  });

  it('produces a flattened 3-page A4 document with no remaining form fields', async () => {
    const doc = await fillL203(data);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getForm().getFields().length).toBe(0);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.3, 0);
      expect(page.getHeight()).toBeCloseTo(841.9, 0);
    }
  });

  it('leaves Kontoinhaber empty when account holder equals the claimant', async () => {
    const doc = await PDFDocument.load(loadL203Template());
    fillL203Fields(doc, { ...data, accountHolderName: 'Juan Dela Cruz' });
    expect(
      doc
        .getForm()
        .getTextField('topmostSubform[0].Page1[0].Kontoinhaber[0]')
        .getText() ?? ''
    ).toBe('');
  });
});
