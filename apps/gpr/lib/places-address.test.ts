import { describe, expect, it } from 'vitest';
import * as gpr from './places-address';
// The VBL app has no unit-test runner; its copy must stay identical.
import * as vbl from '../../vbl/lib/places-address';

const c = (long_name: string, types: string[], short_name = long_name) => ({
  long_name,
  short_name,
  types,
});

// Shapes as Google returns them (captured on staging, 13 Nov 2026).
const linden77 = [
  c('77', ['street_number']),
  c('Unter den Linden', ['route']),
  c('Mitte', ['sublocality_level_1', 'sublocality', 'political']),
  c('Berlin', ['locality', 'political']),
  c('Germany', ['country', 'political'], 'DE'),
  c('10117', ['postal_code']),
];
const hauptstrasseNoNumber = [
  c('Hauptstraße', ['route']),
  c('Heidelberg', ['locality', 'political']),
  c('Germany', ['country', 'political'], 'DE'),
];
const fifthAve = [
  c('350', ['street_number']),
  c('5th Avenue', ['route'], '5th Ave'),
  c('New York', ['locality', 'political']),
  c('United States', ['country', 'political'], 'US'),
  c('10118', ['postal_code']),
];
const londonNoNumber = [
  c('Baker Street', ['route'], 'Baker St'),
  c('London', ['postal_town']),
  c('United Kingdom', ['country', 'political'], 'GB'),
];
const cityOnly = [
  c('Berlin', ['locality', 'political']),
  c('Germany', ['country', 'political'], 'DE'),
];

describe.each([
  ['gpr', gpr],
  ['vbl', vbl],
])('parsePlace (%s copy)', (_name, m) => {
  it('puts the number after the street in Germany', () => {
    expect(m.parsePlace(linden77, 'Unter den Linden 77 Berl')).toEqual({
      streetAndNumber: 'Unter den Linden 77',
      postalCode: '10117',
      city: 'Berlin',
      countryCode: 'DE',
    });
  });

  it('puts the number first in the US', () => {
    expect(m.parsePlace(fifthAve, '350 Fifth Av').streetAndNumber).toBe(
      '350 5th Avenue'
    );
  });

  it('keeps the typed house number when Google has none', () => {
    const p = m.parsePlace(hauptstrasseNoNumber, 'Hauptstraße 5 Heidelb');
    expect(p.streetAndNumber).toBe('Hauptstraße 5');
    expect(p.postalCode).toBe('');
    expect(p.city).toBe('Heidelberg');
  });

  it('keeps a typed number in number-first countries too', () => {
    expect(m.parsePlace(londonNoNumber, '221b Baker St').streetAndNumber).toBe(
      '221b Baker Street'
    );
    expect(m.parsePlace(londonNoNumber, 'Baker St').streetAndNumber).toBe(
      'Baker Street'
    );
  });

  it('returns no street when Google resolved only a city', () => {
    expect(m.parsePlace(cityOnly, 'Berlin').streetAndNumber).toBe('');
  });

  it('prefers Google’s number over the typed one', () => {
    expect(m.parsePlace(linden77, 'Unter den Linden 7').streetAndNumber).toBe(
      'Unter den Linden 77'
    );
  });

  it('handles missing components', () => {
    expect(m.parsePlace(undefined)).toEqual({
      streetAndNumber: '',
      postalCode: '',
      city: '',
      countryCode: '',
    });
  });
});

describe('typedHouseNumber', () => {
  const t = gpr.typedHouseNumber;
  it.each([
    ['Hauptstraße 5 Heidelb', false, '5'],
    ['Friedrichstraße 43 10117', false, '43'],
    ['Friedrichstraße 10117', false, ''],
    ['Am Markt 12a', false, '12a'],
    ['Bahnhofstr. 12-14, Köln', false, '12-14'],
    ['Straße des 17. Juni 100', false, '100'],
    ['Hauptstraße', false, ''],
    ['350 Fifth Av', true, '350'],
    ['Fifth Avenue', true, ''],
    ['350', true, ''],
  ])('%s → %s', (typed, numberFirst, want) => {
    expect(t(typed, numberFirst)).toBe(want);
  });
});
