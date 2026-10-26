import { describe, expect, it } from 'vitest';
import {
  CAVEAT_MULTI,
  CAVEAT_UNKNOWN,
  MSG_IMPLAUSIBLE,
  MSG_NEED_PREFIX,
  NO_ID_GUIDE,
  findOffice,
  prefixCarrier,
  prefixPlausible,
  resolveWithoutNumber,
} from './office-routing';
import {
  CARRIERS,
  LIAISON_BY_COUNTRY,
  REGIONAL_BY_PREFIX,
} from '../../../content/offices';

describe('office data', () => {
  it('has the 16 carriers with verified addresses', () => {
    expect(Object.keys(CARRIERS).length).toBe(16);
    expect(CARRIERS.BW.address).toContain('Stuttgart');
    expect(CARRIERS.KBS.address).toBe(
      'Pieperstraße 14–28, 44789 Bochum, Germany'
    );
  });
  it('carries the verified liaison assignments', () => {
    expect(LIAISON_BY_COUNTRY.IS).toBe('WF');
    expect(LIAISON_BY_COUNTRY.AL).toBe('RLP');
    expect(LIAISON_BY_COUNTRY.LU).toBe('RLP');
    expect(LIAISON_BY_COUNTRY.IN).toBe('NORD');
    expect(LIAISON_BY_COUNTRY.CY).toBe('BW');
  });
});

describe('prefix rules', () => {
  it('classifies KBS, Bund and regional prefixes', () => {
    expect(prefixCarrier(38)).toBe('KBS');
    expect(prefixCarrier(89)).toBe('KBS');
    expect(prefixCarrier(53)).toBe('BUND');
    expect(prefixCarrier(13)).toBe('RHL');
    expect(prefixCarrier(1)).toBeNull();
  });
  it('rejects implausible two-digit inputs', () => {
    expect(prefixPlausible(13)).toBe(true);
    expect(prefixPlausible(53)).toBe(true); // 13 + 40 (Bund)
    expect(prefixPlausible(40)).toBe(false); // Riester look-alike
    expect(prefixPlausible(83)).toBe(false); // not an allocated KBS prefix
    expect(prefixPlausible(1)).toBe(false);
    expect(Object.keys(REGIONAL_BY_PREFIX).length).toBe(23);
  });
});

describe('findOffice — rule order', () => {
  it('1. KBS ever wins over everything', () => {
    const r = findOffice({
      lastOffice: 'KBS',
      citizenship: 'US',
      residence: 'IN',
    });
    expect(r.kind === 'office' && r.carrier).toBe('KBS');
  });
  it('2. last office Bund → Bund', () => {
    const r = findOffice({
      lastOffice: 'BUND',
      citizenship: 'US',
      residence: 'US',
    });
    expect(r.kind === 'office' && r.carrier).toBe('BUND');
  });
  it('3. citizenship liaison, with the multi-connection caveat', () => {
    const r = findOffice({
      lastOffice: 'HE',
      citizenship: 'IN',
      residence: 'BR',
    });
    expect(r.kind).toBe('office');
    if (r.kind === 'office') {
      expect(r.carrier).toBe('NORD');
      expect(r.caveats).toContain(CAVEAT_MULTI);
      expect(r.caveats).not.toContain(CAVEAT_UNKNOWN);
    }
  });
  it('4. residence liaison when the citizenship has none', () => {
    const r = findOffice({
      lastOffice: 'HE',
      citizenship: 'NG',
      residence: 'AU',
    });
    expect(r.kind === 'office' && r.carrier).toBe('OLB');
  });
  it('5. account-holding regional carrier', () => {
    const r = findOffice({
      lastOffice: 'HE',
      citizenship: 'NG',
      residence: 'NG',
    });
    expect(r.kind === 'office' && r.carrier).toBe('HE');
  });
  it('6. nothing matched', () => {
    const r = findOffice({
      lastOffice: 'UNKNOWN',
      citizenship: 'NG',
      residence: 'NG',
      prefix: 1,
    });
    expect(r.kind).toBe('no-match');
  });
});

describe('findOffice — unknown office, prefix path', () => {
  it('needs a prefix', () => {
    const r = findOffice({
      lastOffice: 'UNKNOWN',
      citizenship: 'US',
      residence: 'US',
    });
    expect(r).toEqual({ kind: 'error', message: MSG_NEED_PREFIX });
  });
  it('rejects an implausible prefix with guidance', () => {
    const r = findOffice({
      lastOffice: 'UNKNOWN',
      citizenship: 'US',
      residence: 'US',
      prefix: 40,
    });
    expect(r).toEqual({ kind: 'no-match', message: MSG_IMPLAUSIBLE });
  });
  it('KBS and Bund prefixes decide before the country connections', () => {
    const kbs = findOffice({
      lastOffice: 'UNKNOWN',
      citizenship: 'US',
      residence: 'US',
      prefix: 39,
    });
    expect(kbs.kind === 'office' && kbs.carrier).toBe('KBS');
    const bund = findOffice({
      lastOffice: 'UNKNOWN',
      citizenship: 'US',
      residence: 'US',
      prefix: 53,
    });
    expect(bund.kind === 'office' && bund.carrier).toBe('BUND');
    expect(bund.kind === 'office' && bund.caveats.length).toBe(1);
  });
  it('regional prefix + no connection → that carrier, via-prefix note', () => {
    const r = findOffice({
      lastOffice: 'UNKNOWN',
      citizenship: 'NG',
      residence: 'NG',
      prefix: 28,
    });
    expect(r.kind).toBe('office');
    if (r.kind === 'office') {
      expect(r.carrier).toBe('OLB');
      expect(r.reason).toContain('first two digits');
      expect(r.caveats.length).toBe(1);
    }
  });
});

describe('resolveWithoutNumber', () => {
  it('routes by citizenship with the unknown-office and identification caveats', () => {
    const r = resolveWithoutNumber('IN', 'BR');
    expect(r.kind).toBe('office');
    if (r.kind === 'office') {
      expect(r.carrier).toBe('NORD');
      expect(r.caveats).toEqual([CAVEAT_MULTI, CAVEAT_UNKNOWN, NO_ID_GUIDE]);
    }
  });
  it('routes by residence, then dead-ends with the identification guide', () => {
    const res = resolveWithoutNumber('NG', 'CA');
    expect(res.kind === 'office' && res.carrier).toBe('NORD');
    const none = resolveWithoutNumber('NG', 'NG');
    expect(none.kind).toBe('no-match');
    expect(none.kind === 'no-match' && none.message).toContain(NO_ID_GUIDE);
  });
});
