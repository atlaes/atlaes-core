import { describe, expect, it } from 'vitest';
import { getBavThresholds, residenceCountryPhrase } from './constants';
import { formatIban, formatLetterAmount, formatLetterDate } from './format';

describe('thresholds', () => {
  it('returns the 2026 BRSG II values', () => {
    expect(getBavThresholds(2026)).toEqual({
      bezugsgroesse: 3955,
      pension: 59.33,
      capital: 7119,
    });
    expect(formatLetterAmount(getBavThresholds('2026').pension)).toBe('59,33');
    expect(formatLetterAmount(getBavThresholds('2026').capital)).toBe(
      '7.119,00'
    );
  });

  it('refuses a year without a row instead of guessing', () => {
    expect(() => getBavThresholds(2031)).toThrow(/threshold row for 2031/);
  });
});

describe('residence country phrase', () => {
  it('maps spec countries to their dative phrase', () => {
    expect(residenceCountryPhrase('USA')).toBe('den USA');
    expect(residenceCountryPhrase('Switzerland')).toBe('der Schweiz');
    expect(residenceCountryPhrase('United Kingdom')).toBe(
      'dem Vereinigten Königreich'
    );
    expect(residenceCountryPhrase('india')).toBe('Indien');
  });

  it('returns null for an unknown country', () => {
    expect(residenceCountryPhrase('Peru')).toBeNull();
  });
});

describe('formatting', () => {
  it('formats ISO dates as DD.MM.YYYY', () => {
    expect(formatLetterDate('2026-09-07')).toBe('07.09.2026');
    expect(formatLetterDate('2021-03-15T00:00:00.000Z')).toBe('15.03.2021');
    expect(formatLetterDate(new Date(2026, 0, 2))).toBe('02.01.2026');
    expect(() => formatLetterDate('07.09.2026')).toThrow();
  });

  it('formats amounts in German notation with two decimals', () => {
    expect(formatLetterAmount(1234.5)).toBe('1.234,50');
    expect(formatLetterAmount(59.33)).toBe('59,33');
    expect(formatLetterAmount(7119)).toBe('7.119,00');
    expect(formatLetterAmount(1234567.891)).toBe('1.234.567,89');
    expect(formatLetterAmount(0)).toBe('0,00');
  });

  it('groups IBANs in blocks of four', () => {
    expect(formatIban('BE19905691823912')).toBe('BE19 9056 9182 3912');
    expect(formatIban('be19 9056 9182 3912')).toBe('BE19 9056 9182 3912');
    expect(formatIban('DE02100100100000000001')).toBe(
      'DE02 1001 0010 0000 0000 01'
    );
  });
});
