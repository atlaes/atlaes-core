import { describe, expect, it } from 'vitest';
import {
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
