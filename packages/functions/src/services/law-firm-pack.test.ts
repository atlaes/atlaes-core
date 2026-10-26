import { describe, expect, it } from 'vitest';
import {
  caseCopyFields,
  countryNameDe,
  countryIso,
  drvPackClientFromClaim,
  submissionPackKey,
  type DrvClaimFields,
} from './law-firm-pack';

const full: DrvClaimFields = {
  firstName: 'Priya',
  lastName: 'Sharma',
  dateOfBirth: '1990-03-12',
  nationality: 'India',
  placeOfBirth: 'Pune',
  passportNumber: 'Z1234567',
  currentAddressLine1: '14 MG Road',
  currentAddressLine2: null,
  currentCity: 'Pune',
  currentPostalCode: '411001',
  currentCountry: 'IN',
  germanStreet: 'Musterstraße 1',
  germanPostalCode: '10115',
  germanCity: 'Berlin',
  moveOutDate: '2024-06-30',
  vsnr: '65 120390 S 512',
  sex: 'female',
  birthName: null,
  phone: null,
  germanContributionMonths: 38,
};

describe('countryIso', () => {
  it('accepts ISO codes and German or English names', () => {
    expect(countryIso('in')).toBe('IN');
    expect(countryIso('Indien')).toBe('IN');
    expect(countryIso('India')).toBe('IN');
    expect(countryIso('South Korea')).toBe('KR');
    expect(countryIso('Atlantis')).toBeNull();
    expect(countryIso(null)).toBeNull();
  });
});

describe('drvPackClientFromClaim', () => {
  it('maps a complete claim', () => {
    const m = drvPackClientFromClaim(full);
    expect(m.missing).toEqual([]);
    expect(m.client).toMatchObject({
      citizenshipIso: 'IN',
      residenceIso: 'IN',
      countryLabel: 'Indien',
      lastGermanAddress: 'Musterstraße 1, 10115 Berlin',
    });
  });

  it('lists what is missing instead of guessing', () => {
    const m = drvPackClientFromClaim({
      ...full,
      vsnr: null,
      passportNumber: ' ',
      sex: 'x',
      nationality: 'Atlantis',
    });
    expect(m.client).toBeNull();
    expect(m.missing).toEqual(
      expect.arrayContaining([
        'insurance number (VSNR)',
        'passport number',
        'sex (male/female/none/diverse)',
        'nationality as a recognised country',
      ])
    );
  });
});

describe('submissionPackKey', () => {
  it('is unique per generation and safe for S3', () => {
    const key = submissionPackKey('abc', new Date('2026-09-22T09:14:05.123Z'));
    expect(key).toBe('claims/abc/submission-pack/2026-09-22T09-14-05-123Z.pdf');
  });
});

describe('firm copy fields (owner order, 20 Oct 2026)', () => {
  const base = {
    firstName: 'Priya',
    lastName: 'Sharma',
    currentAddressLine1: 'MG Road 12a',
    currentAddressLine2: null,
    currentPostalCode: '411001',
    currentCity: 'Pune',
    currentCountry: 'India',
    dateOfBirth: '1990-03-12',
    nationality: 'India',
    germanStreet: 'Kaskelstraße 46',
    germanPostalCode: '10317',
    germanCity: 'Berlin',
    moveOutDate: '2024-06-30',
    lawFirmRef: '06152-26',
    identifier: { label: 'Insurance number (VSNR)', value: '65 120390 S 512' },
  };

  it('orders name, street, house number, postal code, city, country (German)', () => {
    const f = caseCopyFields(base);
    expect(f.address.map((x) => [x.key, x.value])).toEqual([
      ['firstName', 'Priya'],
      ['lastName', 'Sharma'],
      ['street', 'MG Road'],
      ['houseNumber', '12a'],
      ['postalCode', '411001'],
      ['city', 'Pune'],
      ['country', 'Indien'],
    ]);
    expect(f.details.map((x) => [x.key, x.value])).toEqual([
      ['dateOfBirth', '12.03.1990'],
      ['nationality', 'Indien'],
      ['identifier', '65 120390 S 512'],
    ]);
    expect(f.german.map((x) => [x.key, x.value])).toEqual([
      ['lastGermanAddress', 'Kaskelstraße 46, 10317 Berlin'],
      ['leftGermany', '30.06.2024'],
      ['aktenzeichen', '06152-26'],
    ]);
  });

  it('splits leading house numbers and keeps an address supplement', () => {
    const f = caseCopyFields({
      ...base,
      currentAddressLine1: '111 Abbey Road',
      currentAddressLine2: 'Flat 4',
    });
    expect(f.address.slice(2, 5).map((x) => [x.key, x.value])).toEqual([
      ['street', 'Abbey Road'],
      ['houseNumber', '111'],
      ['addressSupplement', 'Flat 4'],
    ]);
  });

  it('leaves the house number empty when the line has none', () => {
    const f = caseCopyFields({ ...base, currentAddressLine1: 'Rua Augusta' });
    expect(f.address[2].value).toBe('Rua Augusta');
    expect(f.address[3].value).toBeNull();
  });
});

describe('countryNameDe', () => {
  it('uses the register name, then ICU, then the stored value', () => {
    expect(countryNameDe('India')).toBe('Indien');
    expect(countryNameDe('BR')).toBe('Brasilien');
    expect(countryNameDe('Brasilien')).toBe('Brasilien');
    expect(countryNameDe('MZ')).toBe('Mosambik');
    expect(countryNameDe('Atlantis')).toBe('Atlantis');
    expect(countryNameDe('')).toBeNull();
  });
});
