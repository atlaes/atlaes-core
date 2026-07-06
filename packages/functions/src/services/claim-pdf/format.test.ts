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
  it('splits street and house number', () => {
    expect(splitStreetHouseNumber('Kaskelstraße 46')).toEqual({
      street: 'Kaskelstraße',
      houseNumber: '46',
    });
    expect(splitStreetHouseNumber('123 Main Street')).toEqual({
      street: '123 Main Street',
      houseNumber: '',
    }); // leading-number formats stay intact in street
    expect(splitStreetHouseNumber('Musterweg 12a')).toEqual({
      street: 'Musterweg',
      houseNumber: '12a',
    });
  });
});
