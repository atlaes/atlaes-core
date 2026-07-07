import { describe, it, expect } from 'vitest';
import {
  formatGermanDate,
  formatGermanDateCompact,
  countryToIso3,
  splitStreetHouseNumber,
} from './format';

describe('format helpers', () => {
  it('formats German dates', () => {
    expect(formatGermanDate('1990-03-05')).toBe('05.03.1990');
    expect(formatGermanDate(new Date(2026, 6, 6))).toBe('06.07.2026');
  });
  it('formats compact DDMMYYYY for L203 comb field', () => {
    expect(formatGermanDateCompact('1990-03-05')).toBe('05031990');
  });
  it('maps countries to ISO alpha-3', () => {
    expect(countryToIso3('Philippines')).toBe('PHL');
    expect(countryToIso3('Australia')).toBe('AUS');
    expect(countryToIso3('AUS')).toBe('AUS'); // pass-through
    expect(countryToIso3('Atlantis')).toBe(''); // unknown → empty, form stays blank
    expect(countryToIso3(null)).toBe('');
  });
  it('maps the UK and common variants to GBR (case-insensitive)', () => {
    expect(countryToIso3('United Kingdom')).toBe('GBR');
    expect(countryToIso3('united kingdom')).toBe('GBR');
    expect(countryToIso3('UK')).toBe('GBR');
    expect(countryToIso3('Great Britain')).toBe('GBR');
    expect(countryToIso3('England')).toBe('GBR');
    expect(countryToIso3('GB')).toBe('GBR'); // ISO alpha-2
    expect(countryToIso3('GBR')).toBe('GBR'); // ISO alpha-3 pass-through
  });
  it('maps a broad set of claimant countries', () => {
    expect(countryToIso3('New Zealand')).toBe('NZL');
    expect(countryToIso3('United States')).toBe('USA');
    expect(countryToIso3('USA')).toBe('USA');
    expect(countryToIso3('Canada')).toBe('CAN');
    expect(countryToIso3('Ireland')).toBe('IRL');
    expect(countryToIso3('South Africa')).toBe('ZAF');
    expect(countryToIso3('India')).toBe('IND');
    expect(countryToIso3('Germany')).toBe('DEU');
    expect(countryToIso3('Netherlands')).toBe('NLD');
  });
  it('splits street and house number (trailing, German style)', () => {
    expect(splitStreetHouseNumber('Kaskelstraße 46')).toEqual({
      street: 'Kaskelstraße',
      houseNumber: '46',
    });
    expect(splitStreetHouseNumber('Musterweg 12a')).toEqual({
      street: 'Musterweg',
      houseNumber: '12a',
    });
    expect(splitStreetHouseNumber('Abbey Road 111')).toEqual({
      street: 'Abbey Road',
      houseNumber: '111',
    });
  });
  it('splits street and house number (leading, UK/US style)', () => {
    expect(splitStreetHouseNumber('111 Abbey Road')).toEqual({
      street: 'Abbey Road',
      houseNumber: '111',
    });
    expect(splitStreetHouseNumber('12a Main Street')).toEqual({
      street: 'Main Street',
      houseNumber: '12a',
    });
    // Trailing takes precedence over leading when both are present.
    expect(splitStreetHouseNumber('10 Downing Street 5')).toEqual({
      street: '10 Downing Street',
      houseNumber: '5',
    });
  });
  it('returns the whole line as street when no house number is present', () => {
    expect(splitStreetHouseNumber('Abbey Road')).toEqual({
      street: 'Abbey Road',
      houseNumber: '',
    });
  });
});
